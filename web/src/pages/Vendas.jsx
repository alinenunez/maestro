import { useEffect, useRef, useState } from "react";
import CabecalhoPainel from "../components/CabecalhoPainel";
import HistoricoVendas from "../components/HistoricoVendas";
import { useAuth } from "../contexts/AuthContext";
import { dinheiro, numero } from "../utils/formatacao";
import { centavos, reais, quantidadeValida, totalPedido, limiteQuantidade, limiteTotal } from "../utils/calculoVenda";
import "../dashboard.css";
import "../vendas.css";

const tipos = { bebida_alcoolica: "Bebida alcoólica", bebida_nao_alcoolica: "Bebida não alcoólica", guloseima: "Guloseima", ficha_sinuca: "Ficha de sinuca" };

export default function Vendas() {
    const { consultar } = useAuth();
    const [catalogo, setCatalogo] = useState(null);
    const [erroCatalogo, setErroCatalogo] = useState("");
    const [revisao, setRevisao] = useState(0);
    const [revisaoHistorico, setRevisaoHistorico] = useState(0);
    const [tipo, setTipo] = useState("");
    const [busca, setBusca] = useState("");
    const [idProduto, setIdProduto] = useState("");
    const [quantidade, setQuantidade] = useState("1");
    const [idResponsavel, setIdResponsavel] = useState("");
    const [maiorIdade, setMaiorIdade] = useState(false);
    const [itens, setItens] = useState([]);
    const [erroItem, setErroItem] = useState("");
    const [erroPedido, setErroPedido] = useState("");
    const [sucesso, setSucesso] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [envioIncerto, setEnvioIncerto] = useState(false);
    const trava = useRef(false);

    useEffect(() => {
        const controle = new AbortController();
        setCatalogo(null); setErroCatalogo("");
        Promise.all([
            consultar("/produtos", { signal: controle.signal }),
            consultar("/usuarios/responsaveis", { signal: controle.signal }),
        ]).then(([produtos, responsaveis]) => {
            if (!controle.signal.aborted) setCatalogo({ produtos, responsaveis });
        }).catch(erro => { if (!controle.signal.aborted) setErroCatalogo(erro.message); });
        return () => controle.abort();
    }, [consultar, revisao]);

    const opcoes = (catalogo?.produtos || []).filter(produto => tipos[produto.tipo_produto] && (!tipo || produto.tipo_produto === tipo) && produto.nome_produto.toLocaleLowerCase("pt-BR").includes(busca.trim().toLocaleLowerCase("pt-BR")));
    const selecionado = opcoes.find(produto => String(produto.id_produto) === idProduto);
    const preco = selecionado ? centavos(selecionado.valor_unitario) : null;
    const subtotal = preco !== null && quantidadeValida(quantidade) ? preco * BigInt(quantidade) : null;
    const total = totalPedido(itens);
    const temAlcool = itens.some(item => item.tipo_produto === "bebida_alcoolica");
    const mostrarMaioridade = temAlcool || selecionado?.tipo_produto === "bebida_alcoolica";
    const bloqueado = enviando || envioIncerto;
    const responsavelValido = catalogo?.responsaveis.some(usuario => String(usuario.id_usuario) === idResponsavel);
    const jaNoPedido = itens.find(item => item.id_produto === selecionado?.id_produto)?.quantidade || 0;

    function atualizar() {
        if (trava.current) return;
        setRevisao(n => n + 1); setRevisaoHistorico(n => n + 1);
    }

    function adicionar(evento) {
        evento.preventDefault();
        if (trava.current || envioIncerto) return;
        setErroItem(""); setSucesso("");
        if (!selecionado) { setErroItem("Selecione um produto da lista."); return; }
        if (!quantidadeValida(quantidade)) { setErroItem("Informe uma quantidade inteira maior que zero, até 2147483647."); return; }
        if (preco === null) { setErroItem("O preço deste produto é inválido. Peça ao administrador para corrigir o cadastro."); return; }
        const acumulada = jaNoPedido + Number(quantidade);
        if (acumulada > limiteQuantidade) { setErroItem("A quantidade acumulada deste produto ultrapassa o limite permitido."); return; }
        if (selecionado.tipo_produto !== "ficha_sinuca" && acumulada > selecionado.quantidade_produto) {
            setErroItem(`Estoque insuficiente: ${numero(selecionado.quantidade_produto)} unidade(s) disponível(is), com ${numero(jaNoPedido)} já no pedido.`); return;
        }
        if (selecionado.tipo_produto === "bebida_alcoolica" && !maiorIdade) { setErroItem("Confirme que o cliente tem 18 anos ou mais para adicionar a bebida alcoólica."); return; }
        const item = { id_produto: selecionado.id_produto, nome_produto: selecionado.nome_produto, tipo_produto: selecionado.tipo_produto, valor_unitario: reais(preco), quantidade: acumulada };
        const novos = jaNoPedido ? itens.map(atual => atual.id_produto === item.id_produto ? item : atual) : [...itens, item];
        if (totalPedido(novos) > limiteTotal) { setErroItem("O total do pedido ultrapassa o limite de R$ 9.999.999.999,99."); return; }
        setItens(novos); setQuantidade("1"); setErroPedido("");
    }

    function remover(id) {
        if (trava.current || envioIncerto) return;
        const restantes = itens.filter(item => item.id_produto !== id);
        setItens(restantes); setErroPedido("");
        if (!restantes.some(item => item.tipo_produto === "bebida_alcoolica")) setMaiorIdade(false);
    }

    function limparPedido() {
        setItens([]); setMaiorIdade(false); setIdProduto(""); setQuantidade("1");
        setIdResponsavel(""); setTipo(""); setBusca(""); setErroItem(""); setErroPedido(""); setEnvioIncerto(false);
    }

    async function finalizar() {
        if (trava.current || envioIncerto) return;
        setErroPedido(""); setSucesso("");
        if (!itens.length) { setErroPedido("Adicione pelo menos um produto ao pedido."); return; }
        if (!catalogo) { setErroPedido("Carregue os produtos e responsáveis antes de finalizar."); return; }
        if (!responsavelValido) { setErroPedido("Selecione o responsável pela venda."); return; }
        if (temAlcool && !maiorIdade) { setErroPedido("Confirme que o cliente tem 18 anos ou mais. O pedido contém bebida alcoólica."); return; }
        trava.current = true; setEnviando(true);
        let enviado = false;
        try {
            // Atualiza o cadastro antes do POST; alteracoes de preco/tipo exigem revisar o resumo.
            const [produtos, responsaveis] = await Promise.all([consultar("/produtos"), consultar("/usuarios/responsaveis")]);
            setCatalogo({ produtos, responsaveis });
            if (!responsaveis.some(usuario => String(usuario.id_usuario) === idResponsavel)) {
                setIdResponsavel(""); throw new Error("O responsável não está mais disponível. Selecione outro usuário ativo.");
            }
            let alterado = false;
            const revisados = itens.map(item => {
                const produto = produtos.find(produto => produto.id_produto === item.id_produto);
                if (!produto || !tipos[produto.tipo_produto]) throw new Error(`${item.nome_produto} não está disponível para venda. Remova o item ou confira seu cadastro.`);
                const precoAtual = centavos(produto.valor_unitario);
                if (precoAtual === null) throw new Error(`O preço de ${produto.nome_produto} é inválido. Confira o cadastro.`);
                if (precoAtual !== centavos(item.valor_unitario) || produto.tipo_produto !== item.tipo_produto) alterado = true;
                return { ...item, nome_produto: produto.nome_produto, tipo_produto: produto.tipo_produto, valor_unitario: reais(precoAtual) };
            });
            setItens(revisados);
            if (alterado) {
                setMaiorIdade(false);
                throw new Error("O preço ou tipo de um produto mudou. Confira o resumo atualizado e finalize novamente.");
            }
            for (const item of revisados) {
                const produto = produtos.find(produto => produto.id_produto === item.id_produto);
                if (produto.tipo_produto !== "ficha_sinuca" && item.quantidade > produto.quantidade_produto) {
                    throw new Error(`Estoque insuficiente para ${produto.nome_produto}: ${numero(produto.quantidade_produto)} unidade(s) disponível(is). Remova o item e adicione a quantidade desejada.`);
                }
            }
            if (totalPedido(revisados) > limiteTotal) throw new Error("O total do pedido ultrapassa o limite de R$ 9.999.999.999,99.");
            enviado = true;
            const venda = await consultar("/vendas", { metodo: "POST", dados: {
                id_usuario: Number(idResponsavel), confirmacao_maior_idade: temAlcool && maiorIdade,
                itens: revisados.map(item => ({ id_produto: item.id_produto, quantidade: item.quantidade })),
            } });
            limparPedido();
            setSucesso(`Venda #${venda.id_venda} registrada. Total: ${dinheiro(venda.valor_total)}. Responsável: ${venda.usuario.nome_completo}.`);
            setRevisao(n => n + 1); setRevisaoHistorico(n => n + 1);
        } catch (erro) {
            if (enviado && (!erro.status || erro.status >= 500)) {
                setEnvioIncerto(true); setRevisaoHistorico(n => n + 1);
                setErroPedido("Não foi possível confirmar o resultado do envio. A venda pode ter sido registrada. Confira o histórico antes de tentar novamente.");
            } else {
                setErroPedido(erro.message);
            }
        } finally { trava.current = false; setEnviando(false); }
    }

    return <div className="dashboard-layout"><CabecalhoPainel /><main className="painel-conteudo">
        <div className="painel-titulo"><div><p className="sobretitulo">ATENDIMENTO E PEDIDOS</p><h1>Registro de vendas</h1><p>Venda produtos do cardápio e fichas de sinuca.</p></div><button className="atualizar" disabled={enviando} onClick={atualizar}>Atualizar dados</button></div>
        {sucesso && <p className="mensagem sucesso" role="status">{sucesso}</p>}
        <div className="vendas-layout">
            <section className="venda-editor" aria-labelledby="titulo-nova-venda">
                <h2 id="titulo-nova-venda">Nova venda</h2><p className="venda-ajuda">Escolha os produtos e adicione ao pedido.</p>
                {erroCatalogo ? <div className="mensagem erro" role="alert"><p>{erroCatalogo}</p><button className="atualizar" disabled={enviando} onClick={atualizar}>Recarregar produtos e responsáveis</button></div>
                    : !catalogo ? <p className="venda-ajuda" role="status">Carregando produtos e responsáveis…</p>
                        : !catalogo.produtos.length && <p className="venda-ajuda" role="status">Nenhum produto cadastrado. Peça ao administrador para cadastrá-los em Produtos.</p>}
                <form onSubmit={adicionar} noValidate><fieldset disabled={bloqueado || !catalogo}>
                    <div className="venda-campos">
                        <div className="campo"><label htmlFor="tipo-venda">Tipo do produto</label><select id="tipo-venda" value={tipo} onChange={e => { setTipo(e.target.value); setIdProduto(""); setErroItem(""); }}><option value="">Todos os tipos</option>{Object.entries(tipos).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}</select></div>
                        <div className="campo"><label htmlFor="busca-venda">Buscar produto por nome</label><input id="busca-venda" type="search" value={busca} maxLength={150} onChange={e => { setBusca(e.target.value); setIdProduto(""); setErroItem(""); }} placeholder="Ex.: Heineken" /></div>
                    </div>
                    <div className="campo"><label htmlFor="produto-venda">Produto</label><select id="produto-venda" required value={selecionado ? idProduto : ""} onChange={e => { setIdProduto(e.target.value); setErroItem(""); }}><option value="">Selecione um produto</option>{opcoes.map(produto => <option key={produto.id_produto} value={produto.id_produto}>{produto.nome_produto}</option>)}</select>
                        {catalogo && !opcoes.length && <p className="venda-ajuda" role="status">Nenhum produto encontrado para esses filtros.</p>}
                        {selecionado && <p className="venda-ajuda">{selecionado.tipo_produto === "ficha_sinuca" ? "Ficha de sinuca: venda por quantidade, sem controle de estoque." : `Estoque: ${numero(selecionado.quantidade_produto)} unidade(s) · Já no pedido: ${numero(jaNoPedido)}.`}</p>}
                    </div>
                    <div className="venda-campos">
                        <div className="campo"><label htmlFor="quantidade-venda">Quantidade</label><input id="quantidade-venda" type="number" min="1" max={limiteQuantidade} step="1" required value={quantidade} onChange={e => setQuantidade(e.target.value)} /></div>
                        <div className="campo"><label htmlFor="preco-venda">Valor unitário</label><input id="preco-venda" readOnly value={preco === null ? "—" : dinheiro(reais(preco))} /></div>
                        <div className="campo"><label htmlFor="subtotal-venda">Subtotal do item</label><input id="subtotal-venda" readOnly value={subtotal === null ? "—" : dinheiro(reais(subtotal))} /></div>
                        <div className="campo"><label htmlFor="responsavel-venda">Responsável pela venda</label><select id="responsavel-venda" value={responsavelValido ? idResponsavel : ""} onChange={e => setIdResponsavel(e.target.value)}><option value="">Selecione o responsável</option>{(catalogo?.responsaveis || []).map(usuario => <option key={usuario.id_usuario} value={usuario.id_usuario}>{usuario.nome_completo}</option>)}</select></div>
                    </div>
                    {catalogo && !catalogo.responsaveis.length && <p className="venda-ajuda" role="status">Nenhum responsável ativo disponível. Não é possível finalizar a venda.</p>}
                    {mostrarMaioridade && <label className="venda-maioridade"><input type="checkbox" checked={maiorIdade} onChange={e => setMaiorIdade(e.target.checked)} /><span>Confirmo que o cliente tem 18 anos ou mais.<small>Obrigatório para pedidos com bebida alcoólica.</small></span></label>}
                    {erroItem && <p className="mensagem erro" role="alert">{erroItem}</p>}
                    <button className="botao-primario adicionar-item" disabled={!selecionado}>+ Adicionar ao pedido</button>
                </fieldset></form>
            </section>

            <section className="bloco resumo-venda" aria-labelledby="titulo-resumo-venda" aria-busy={enviando}>
                <div className="bloco-titulo"><h2 id="titulo-resumo-venda">Resumo do pedido</h2><span className="contador">{numero(itens.length)} produto(s)</span></div>
                {!itens.length ? <div className="estado-vazio"><h3>Seu pedido está vazio</h3><p>Adicione os produtos para montar a venda.</p></div>
                    : <ul className="pedido-itens">{itens.map(item => <li key={item.id_produto}><div><strong>{item.nome_produto}</strong><span>{numero(item.quantidade)} × {dinheiro(item.valor_unitario)}</span><b>{dinheiro(reais(centavos(item.valor_unitario) * BigInt(item.quantidade)))}</b></div><button type="button" disabled={bloqueado} onClick={() => remover(item.id_produto)} aria-label={`Remover ${item.nome_produto} do pedido`}>×</button></li>)}</ul>}
                <div className="pedido-fechamento">
                    <p className="pedido-total">Total do pedido <strong>{dinheiro(reais(total))}</strong></p>
                    <p className="venda-nota">Adicionar ao pedido não registra a venda. Os preços e o estoque serão conferidos ao finalizar.</p>
                    {erroPedido && <p className="mensagem erro" role="alert">{erroPedido}</p>}
                    {envioIncerto && <div className="venda-envio-incerto"><a href="#historico-vendas">Consultar histórico</a><button className="atualizar" onClick={() => { limparPedido(); atualizar(); }}>Venda localizada: limpar pedido</button><button className="atualizar" onClick={() => { setEnvioIncerto(false); setErroPedido(""); }}>Venda não localizada: liberar tentativa</button></div>}
                    <button className="botao-primario" disabled={bloqueado || !catalogo || !itens.length} onClick={finalizar}>{enviando ? "Finalizando…" : "Finalizar venda"}</button>
                    {itens.length > 0 && !bloqueado && <button className="limpar-pedido" onClick={limparPedido}>Limpar pedido</button>}
                </div>
            </section>
        </div>
        <HistoricoVendas revisao={revisaoHistorico} />
    </main></div>;
}
