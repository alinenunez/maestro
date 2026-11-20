import { useEffect, useRef, useState } from "react";
import CabecalhoPainel from "../components/CabecalhoPainel";
import { useAuth } from "../contexts/AuthContext";
import { dataNoite, dinheiro, numero } from "../utils/formatacao";
import { centavos, limiteTotal, quantidadeValida, reais } from "../utils/calculoVenda";
import "../dashboard.css";
import "../estoque.css";

const tipos = { bebida_alcoolica: "Bebida alcoólica", bebida_nao_alcoolica: "Bebida não alcoólica", guloseima: "Guloseima" };

function hoje() {
    const partes = new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const valor = tipo => partes.find(parte => parte.type === tipo).value;
    return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

function Saldo({ quantidade }) {
    return <span className={`estoque-saldo ${quantidade <= 10 ? "baixo" : "regular"}`}>
        {numero(quantidade)} <small>{quantidade === 0 ? "Esgotado" : quantidade <= 10 ? "Baixo" : "OK"}</small>
    </span>;
}

export default function Estoque() {
    const { consultar } = useAuth();
    const [produtos, setProdutos] = useState(null);
    const [erroProdutos, setErroProdutos] = useState("");
    const [entradas, setEntradas] = useState(null);
    const [erroHistorico, setErroHistorico] = useState("");
    const [filtroProduto, setFiltroProduto] = useState("");
    const [tipo, setTipo] = useState("");
    const [revisao, setRevisao] = useState(0);
    const [form, setForm] = useState(() => ({ id_produto: "", quantidade_adquirida: "", data_compra: hoje() }));
    const [ocupado, setOcupado] = useState(false);
    const [erro, setErro] = useState("");
    const [mensagem, setMensagem] = useState("");
    const trava = useRef(false);

    useEffect(() => {
        const controle = new AbortController();
        setProdutos(null); setErroProdutos("");
        consultar("/produtos", { signal: controle.signal })
            .then(lista => { if (!controle.signal.aborted) setProdutos(lista.filter(produto => produto.tipo_produto !== "ficha_sinuca")); })
            .catch(erro => { if (!controle.signal.aborted) setErroProdutos(erro.message); });
        return () => controle.abort();
    }, [consultar, revisao]);

    useEffect(() => {
        const controle = new AbortController();
        setEntradas(null); setErroHistorico("");
        const consulta = filtroProduto ? `?${new URLSearchParams({ id_produto: filtroProduto })}` : "";
        consultar(`/estoque${consulta}`, { signal: controle.signal })
            .then(lista => { if (!controle.signal.aborted) setEntradas(lista); })
            .catch(erro => { if (!controle.signal.aborted) setErroHistorico(erro.message); });
        return () => controle.abort();
    }, [consultar, filtroProduto, revisao]);

    const opcoes = (produtos || []).filter(produto => !tipo || produto.tipo_produto === tipo);
    const selecionado = opcoes.find(produto => String(produto.id_produto) === form.id_produto);
    const valorUnitarioCentavos = selecionado ? centavos(selecionado.valor_unitario) : null;
    const totalCompraCentavos = valorUnitarioCentavos !== null && quantidadeValida(form.quantidade_adquirida)
        ? valorUnitarioCentavos * BigInt(form.quantidade_adquirida)
        : null;
    const mudar = (campo, valor) => setForm(atual => ({ ...atual, [campo]: valor }));

    async function registrar(evento) {
        evento.preventDefault();
        if (trava.current) return;
        setErro(""); setMensagem("");
        const quantidade = Number(form.quantidade_adquirida);
        if (!selecionado) { setErro("Selecione um produto da lista."); return; }
        if (!/^[1-9][0-9]*$/.test(form.quantidade_adquirida) || quantidade > 2147483647) {
            setErro("Informe uma quantidade inteira entre 1 e 2147483647."); return;
        }
        if (valorUnitarioCentavos === null || totalCompraCentavos === null) { setErro("Não foi possível calcular o valor da compra com o preço cadastrado."); return; }
        if (totalCompraCentavos > limiteTotal) { setErro("O valor total da compra ultrapassa o limite permitido."); return; }
        trava.current = true; setOcupado(true);
        try {
            await consultar("/estoque", { metodo: "POST", dados: {
                id_produto: selecionado.id_produto, quantidade_adquirida: quantidade,
                valor_total: reais(totalCompraCentavos), data_compra: form.data_compra,
            } });
            setMensagem(`Entrada registrada: ${numero(quantidade)} unidade(s) de ${selecionado.nome_produto}. Saldo atualizado.`);
            setForm(atual => ({ ...atual, quantidade_adquirida: "" }));
            setRevisao(atual => atual + 1);
        } catch (erro) {
            // Sem resposta conclusiva, a compra pode ter sido gravada: nao repetir o POST automaticamente.
            setErro(erro.status ? erro.message : "Não foi possível confirmar o resultado do envio. Atualize e confira o histórico antes de registrar essa compra novamente.");
        } finally {
            trava.current = false; setOcupado(false);
        }
    }

    return <div className="dashboard-layout"><CabecalhoPainel /><main className="painel-conteudo">
        <div className="painel-titulo">
            <div><p className="sobretitulo">COMPRAS E REPOSIÇÃO</p><h1>Controle de estoque</h1><p>Entradas de compras e saldo atual por produto.</p></div>
            <button className="atualizar" disabled={ocupado} onClick={() => setRevisao(atual => atual + 1)}>Atualizar</button>
        </div>
        {mensagem && <p className="mensagem sucesso" role="status">{mensagem}</p>}
        <div className="estoque-layout">
            <section aria-labelledby="titulo-historico">
                <div className="estoque-filtro">
                    <label htmlFor="filtro-estoque">Histórico por produto</label>
                    <select id="filtro-estoque" value={filtroProduto} disabled={!produtos || ocupado} onChange={e => setFiltroProduto(e.target.value)}>
                        <option value="">Todos os produtos</option>
                        {(produtos || []).map(produto => <option key={produto.id_produto} value={produto.id_produto}>{produto.nome_produto}</option>)}
                    </select>
                </div>
                <div className="bloco">
                    <div className="bloco-titulo"><div><h2 id="titulo-historico">Histórico de entradas</h2><p>Compras mais recentes primeiro.</p></div>{entradas && <span className="contador">{numero(entradas.length)} registro(s)</span>}</div>
                    {erroHistorico ? <div className="estado-vazio" role="alert"><p>{erroHistorico}</p><button className="atualizar" disabled={ocupado} onClick={() => setRevisao(atual => atual + 1)}>Tentar novamente</button></div>
                        : !entradas ? <p className="estado-vazio" role="status">Carregando entradas…</p>
                            : !entradas.length ? <div className="estado-vazio"><h3>Nenhuma entrada encontrada</h3><p>{filtroProduto ? "Este produto ainda não possui compras registradas." : "As compras registradas aparecerão aqui."}</p></div>
                                : <div className="tabela-container" role="region" aria-label="Entradas de estoque" tabIndex="0"><table>
                                    <thead><tr><th scope="col">Data</th><th scope="col">Produto</th><th scope="col" className="numerico">Qtd. comprada</th><th scope="col" className="numerico">Valor total</th><th scope="col">Saldo atual</th></tr></thead>
                                    <tbody>{entradas.map(entrada => <tr key={entrada.id_estoque}>
                                        <td className="estoque-data">{dataNoite(entrada.data_compra)}</td>
                                        <td><strong>{entrada.produto.nome_produto}</strong><small>{tipos[entrada.produto.tipo_produto] || entrada.produto.tipo_produto}</small></td>
                                        <td className="numerico">{numero(entrada.quantidade_adquirida)}</td>
                                        <td className="numerico">{dinheiro(entrada.valor_total)}</td>
                                        <td><Saldo quantidade={entrada.produto.quantidade_produto} /></td>
                                    </tr>)}</tbody>
                                </table></div>}
                </div>
                <p className="estoque-nota">Saldo atual é a quantidade disponível na última consulta, não o saldo na data da compra. Estoque baixo: até 10 unidades.</p>
            </section>

            <section className="estoque-editor" aria-labelledby="titulo-entrada">
                <h2 id="titulo-entrada">Registrar entrada</h2>
                <p className="estoque-ajuda">Selecione um produto cadastrado para registrar a compra.</p>
                {erroProdutos ? <div className="mensagem erro" role="alert"><p>{erroProdutos}</p><button type="button" className="atualizar" disabled={ocupado} onClick={() => setRevisao(atual => atual + 1)}>Recarregar produtos</button></div>
                    : !produtos ? <p className="estoque-ajuda" role="status">Carregando produtos…</p>
                        : !produtos.length && <p className="estoque-ajuda" role="status">Não há produtos com controle de estoque. Peça ao administrador para cadastrá-los em Produtos.</p>}
                <form onSubmit={registrar} aria-busy={ocupado}><fieldset disabled={ocupado || !produtos?.length}>
                    <div className="campo"><label htmlFor="tipo-entrada">Tipo do produto</label>
                        <select id="tipo-entrada" value={tipo} onChange={e => { setTipo(e.target.value); mudar("id_produto", ""); }}>
                            <option value="">Todos os tipos</option>{Object.entries(tipos).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
                        </select>
                    </div>
                    <div className="campo"><label htmlFor="produto-entrada">Produto</label>
                        <select id="produto-entrada" value={selecionado ? form.id_produto : ""} onChange={e => mudar("id_produto", e.target.value)} required>
                            <option value="">Selecione um produto</option>{opcoes.map(produto => <option key={produto.id_produto} value={produto.id_produto}>{produto.nome_produto}</option>)}
                        </select>
                        {produtos?.length > 0 && !opcoes.length && <p className="estoque-ajuda" role="status">Nenhum produto encontrado para este tipo.</p>}
                        {selecionado && <p className="estoque-ajuda">Saldo atual: <strong>{numero(selecionado.quantidade_produto)} unidade(s)</strong></p>}
                    </div>
                    <div className="estoque-campos">
                        <div className="campo"><label htmlFor="quantidade-entrada">Quantidade comprada</label><input id="quantidade-entrada" type="number" min="1" max="2147483647" step="1" value={form.quantidade_adquirida} onChange={e => mudar("quantidade_adquirida", e.target.value)} required placeholder="24" /></div>
                        <div className="campo"><label htmlFor="valor-entrada">Valor total da compra</label><input id="valor-entrada" value={totalCompraCentavos === null ? "" : dinheiro(reais(totalCompraCentavos))} readOnly placeholder="Informe produto e quantidade" /></div>
                    </div>
                    <div className="campo"><label htmlFor="data-entrada">Data da compra</label><input id="data-entrada" type="date" min="0001-01-01" max="9999-12-31" value={form.data_compra} onChange={e => mudar("data_compra", e.target.value)} required /></div>
                    <p className="estoque-ajuda">{selecionado && <>Custo unitário cadastrado: <strong>{dinheiro(selecionado.valor_unitario)}</strong>. </>}O valor total é calculado automaticamente pela quantidade e pelo valor unitário. Fichas de sinuca não possuem entradas de estoque.</p>
                    {erro && <p className="mensagem erro" role="alert">{erro}</p>}
                    <button className="botao-primario" disabled={!selecionado}>{ocupado ? "Registrando…" : "Registrar entrada"}</button>
                </fieldset></form>
            </section>
        </div>
    </main></div>;
}
