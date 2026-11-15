const repository = require("./dashboard.repository");
const config = require("./dashboard.config");

const falha = (mensagem, statusCode = 400) => Object.assign(new Error(mensagem), { statusCode });

function inteiro(valor) {
    const numero = Number(valor);
    if (!Number.isSafeInteger(numero) || numero < 0) throw new Error("Contagem do dashboard invalida.");
    return numero;
}

function emCentavos(valor) {
    if (typeof valor !== "string" || !/^\d+(\.\d{1,2})?$/.test(valor)) throw new Error("Total de vendas invalido.");
    const [inteiros, decimais = ""] = valor.split(".");
    return BigInt(inteiros) * 100n + BigInt(decimais.padEnd(2, "0"));
}

function decimal(valor) {
    return `${valor / 100n}.${String(valor % 100n).padStart(2, "0")}`;
}

const instante = valor => new Date(valor).toISOString();

async function consultar(filtros = {}) {
    if (Object.keys(filtros).length) throw falha("O dashboard mostra o momento atual e nao aceita filtros.");
    const nomes = [...new Set(config.nomesCervejas.map(nome => nome.trim().toLowerCase()).filter(Boolean))];
    const resumo = await repository.consultar({ ...config, nomesCervejas: nomes });
    const atual = emCentavos(resumo.total_atual);
    const anterior = emCentavos(resumo.total_anterior);
    const possuiMeta = anterior > 0n;

    return {
        atualizado_em: instante(resumo.agora),
        fuso_horario: config.fusoHorario,
        estoque: {
            lista_cervejas_configurada: nomes.length > 0,
            cervejas_disponiveis: nomes.length ? inteiro(resumo.cervejas_disponiveis) : null,
        },
        mesas: {
            total: inteiro(resumo.total_mesas),
            disponiveis: inteiro(resumo.mesas_disponiveis),
            ocupadas: inteiro(resumo.mesas_ocupadas),
            manutencao: inteiro(resumo.mesas_manutencao),
            reservadas_agora: inteiro(resumo.mesas_reservadas),
            livres_agora: inteiro(resumo.mesas_livres),
        },
        vendas: {
            data_noite: resumo.data_noite,
            inicio: instante(resumo.inicio_atual),
            fim: instante(resumo.fim_atual),
            noite_em_andamento: resumo.noite_em_andamento,
            quantidade: inteiro(resumo.quantidade_atual),
            total: decimal(atual),
            noite_anterior: {
                inicio: instante(resumo.inicio_anterior),
                fim: instante(resumo.fim_anterior),
                quantidade: inteiro(resumo.quantidade_anterior),
                total: decimal(anterior),
            },
        },
        meta: {
            disponivel: possuiMeta,
            valor: possuiMeta ? decimal(anterior) : null,
            // Percentual com duas casas, arredondado em inteiros, sem divisao por zero.
            progresso_percentual: possuiMeta ? decimal((atual * 10000n + anterior / 2n) / anterior) : null,
            atingida: possuiMeta ? atual >= anterior : null,
        },
    };
}

module.exports = { consultar };
