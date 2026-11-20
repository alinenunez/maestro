const connection = require("../database/connection");
const repository = require("./vendas.repository");

const falha = (mensagem, statusCode = 400) => Object.assign(new Error(mensagem), { statusCode });
const limiteInteiro = 2147483647;
const limiteCentavos = 999999999999n; // Limite de NUMERIC(12,2).
const tiposPermitidos = ["bebida_alcoolica", "bebida_nao_alcoolica", "guloseima", "ficha_sinuca"];

function validarId(valor, campo) {
    if (!["number", "string"].includes(typeof valor) || !/^[1-9][0-9]*$/.test(String(valor)) || Number(valor) > limiteInteiro) {
        throw falha(`${campo} deve ser um inteiro positivo valido.`);
    }
    return Number(valor);
}

function validarObjeto(dados, campos, mensagem) {
    if (!dados || typeof dados !== "object" || Array.isArray(dados) || !Object.keys(dados).length) {
        throw falha(mensagem);
    }
    if (Object.keys(dados).some(campo => !campos.includes(campo))) {
        throw falha("O corpo possui campos nao permitidos. Informe o valor unitario em cada item; total e data sao definidos pelo servidor.");
    }
}

function preparar(dados) {
    validarObjeto(dados, ["id_usuario", "confirmacao_maior_idade", "itens"], "Envie os dados da venda em um objeto JSON.");
    const idUsuario = validarId(dados.id_usuario, "id_usuario");
    if (Object.hasOwn(dados, "confirmacao_maior_idade") && typeof dados.confirmacao_maior_idade !== "boolean") {
        throw falha("confirmacao_maior_idade deve ser true ou false.");
    }
    if (!Array.isArray(dados.itens) || !dados.itens.length) throw falha("A venda deve possuir pelo menos um item.");

    const agrupados = new Map();
    for (const item of dados.itens) {
        validarObjeto(item, ["id_produto", "quantidade", "valor_unitario"], "Cada item deve conter id_produto, quantidade e valor_unitario.");
        const idProduto = validarId(item.id_produto, "id_produto");
        if (!Number.isInteger(item.quantidade) || item.quantidade <= 0 || item.quantidade > limiteInteiro) {
            throw falha("quantidade deve ser um inteiro positivo valido.");
        }
        const valorUnitario = emReais(emCentavos(item.valor_unitario));
        const anterior = agrupados.get(idProduto);
        if (anterior && anterior.valor_unitario !== valorUnitario) {
            throw falha("Use o mesmo valor unitario para todas as unidades de um produto na venda.");
        }
        const quantidade = (anterior?.quantidade || 0) + item.quantidade;
        if (quantidade > limiteInteiro) throw falha("A quantidade acumulada do produto ultrapassa o limite permitido.");
        agrupados.set(idProduto, { id_produto: idProduto, quantidade, valor_unitario: valorUnitario });
    }
    return {
        id_usuario: idUsuario,
        confirmacao_maior_idade: dados.confirmacao_maior_idade ?? false,
        itens: Array.from(agrupados.values()),
    };
}

function emCentavos(valor) {
    if (!["string", "number"].includes(typeof valor) || !/^\d{1,10}(\.\d{1,2})?$/.test(String(valor))) {
        throw falha("valor_unitario do item deve ser nao negativo, com ate 10 digitos inteiros e 2 decimais. Use ponto decimal.");
    }
    const [inteiros, decimais = ""] = String(valor).split(".");
    return BigInt(inteiros) * 100n + BigInt(decimais.padEnd(2, "0"));
}

function emReais(centavos) {
    return `${centavos / 100n}.${String(centavos % 100n).padStart(2, "0")}`;
}

const listar = () => repository.listar();

async function buscarPorId(id) {
    const venda = await repository.buscarPorId(validarId(id, "id_venda"));
    if (!venda) throw falha("Venda nao encontrada.", 404);
    return venda;
}

async function criar(dados) {
    const preparados = preparar(dados);
    return connection.transaction(async transaction => {
        const usuario = await repository.buscarUsuarioPorId(preparados.id_usuario, transaction);
        if (!usuario) throw falha("Usuario responsavel nao encontrado.", 404);
        if (!usuario.situacao || !["administrador", "funcionario"].includes(usuario.tipo_acesso)) {
            throw falha("Selecione um usuario responsavel ativo e com perfil valido.", 409);
        }

        const produtos = await repository.buscarProdutos(preparados.itens.map(item => item.id_produto), transaction);
        const porId = new Map(produtos.map(produto => [produto.id_produto, produto]));
        const itens = [];
        let totalCentavos = 0n;
        for (const item of preparados.itens) {
            const produto = porId.get(item.id_produto);
            if (!produto) throw falha(`Produto ${item.id_produto} nao encontrado.`, 404);
            if (!tiposPermitidos.includes(produto.tipo_produto)) {
                throw falha(`Atualize o tipo cadastrado do produto ${produto.id_produto} antes de vender.`, 409);
            }
            if (produto.tipo_produto === "bebida_alcoolica" && !preparados.confirmacao_maior_idade) {
                throw falha("Confirme a maioridade do cliente para vender bebidas alcoolicas.");
            }
            if (produto.tipo_produto !== "ficha_sinuca" && produto.quantidade_produto < item.quantidade) {
                throw falha(`Estoque insuficiente para o produto ${produto.id_produto}. Disponivel: ${produto.quantidade_produto}.`, 409);
            }

            // Centavos inteiros evitam erros de precisao no calculo monetario.
            // O cadastro guarda o custo de compra; a venda usa o preço informado para o item.
            const precoCentavos = emCentavos(item.valor_unitario);
            totalCentavos += precoCentavos * BigInt(item.quantidade);
            if (totalCentavos > limiteCentavos) throw falha("O total da venda ultrapassa o limite de valor permitido.");
            itens.push({ ...item, valor_unitario: emReais(precoCentavos) });
        }

        const venda = await repository.criar({
            id_usuario: preparados.id_usuario,
            confirmacao_maior_idade: preparados.confirmacao_maior_idade,
            valor_total: emReais(totalCentavos),
        }, transaction);
        await repository.criarItens(itens.map(item => ({ ...item, id_venda: venda.id_venda })), transaction);
        for (const item of itens) {
            if (porId.get(item.id_produto).tipo_produto !== "ficha_sinuca") {
                await repository.baixarEstoque(item.id_produto, item.quantidade, transaction);
            }
        }
        return repository.buscarPorId(venda.id_venda, transaction);
    });
}

module.exports = { listar, buscarPorId, criar };
