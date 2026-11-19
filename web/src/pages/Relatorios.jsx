import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import CabecalhoPainel from "../components/CabecalhoPainel";
import { useAuth } from "../contexts/AuthContext";
import { dataNoite, dinheiro, numero } from "../utils/formatacao";
import { exibirHorario, paraCampo } from "../utils/horariosReserva";
import "../dashboard.css";
import "../relatorios.css";

const tipos = { manutencao: "Manutenção", energia: "Energia", agua: "Água", limpeza: "Limpeza", outros: "Outros" };
function periodoInicial() {
    const hoje = paraCampo(new Date()).slice(0, 10);
    return { inicio: `${hoje.slice(0, 7)}-01`, fim: hoje };
}
function dataValida(valor) {
    const data = new Date(`${valor}T00:00:00Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(valor) && !valor.startsWith("0000") && Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}
function Tabela({ titulo, colunas, linhas }) {
    return <section className="bloco relatorio-tabela" aria-label={titulo}>
        <div className="bloco-titulo"><h2>{titulo}</h2><span className="contador">{numero(linhas.length)} registro(s)</span></div>
        {!linhas.length ? <p className="estado-vazio">Nenhum lançamento nesta categoria no período.</p> : <div className="tabela-container" role="region" aria-label={`Detalhamento: ${titulo}`} tabIndex="0"><table>
            <thead><tr>{colunas.map(coluna => <th scope="col" key={coluna.nome} className={coluna.numerico ? "numerico" : ""}>{coluna.nome}</th>)}</tr></thead>
            <tbody>{linhas.map(linha => <tr key={linha.id}>{colunas.map((coluna, indice) => <td key={coluna.nome} className={coluna.numerico ? "numerico" : ""}>{linha.valores[indice]}</td>)}</tr>)}</tbody>
        </table></div>}
    </section>;
}

export default function Relatorios() {
    const { usuario } = useAuth();
    return usuario?.tipo_acesso === "administrador" ? <ConteudoRelatorios /> : <Navigate to="/dashboard" replace />;
}

function ConteudoRelatorios() {
    const { consultar } = useAuth();
    const [form, setForm] = useState(periodoInicial);
    const [consulta, setConsulta] = useState(() => ({ ...form, revisao: 0 }));
    const [relatorio, setRelatorio] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [erroPeriodo, setErroPeriodo] = useState("");

    useEffect(() => {
        const controle = new AbortController();
        setCarregando(true); setErro(""); setRelatorio(null);
        const parametros = new URLSearchParams({ inicio: consulta.inicio, fim: consulta.fim });
        consultar(`/relatorios/financeiro/detalhado?${parametros}`, { signal: controle.signal })
            .then(dados => { if (!controle.signal.aborted) setRelatorio(dados); })
            .catch(falha => { if (!controle.signal.aborted) setErro(falha.message); })
            .finally(() => { if (!controle.signal.aborted) setCarregando(false); });
        return () => controle.abort();
    }, [consultar, consulta]);

    function aplicar(evento) {
        evento.preventDefault();
        if (!dataValida(form.inicio) || !dataValida(form.fim)) { setErroPeriodo("Informe datas válidas para o início e o fim."); return; }
        if (form.inicio > form.fim) { setErroPeriodo("A data final deve ser igual ou posterior à inicial."); return; }
        setErroPeriodo("");
        setConsulta(atual => ({ ...form, revisao: atual.revisao + 1 }));
    }
    const pendente = form.inicio !== consulta.inicio || form.fim !== consulta.fim;
    const negativo = relatorio?.resultado_periodo.startsWith("-");
    const semMovimentos = relatorio && !relatorio.vendas.length && !relatorio.compras_estoque.length && !relatorio.despesas_operacionais.length;

    return <div className="dashboard-layout"><CabecalhoPainel /><main className="painel-conteudo">
        <div className="painel-titulo"><div><p className="sobretitulo">RECEITAS E CUSTOS</p><h1>Relatórios financeiros</h1><p>Resumo e detalhamento dos lançamentos do período.</p></div></div>
        <form className="relatorio-filtro" onSubmit={aplicar}>
            <div className="campo"><label htmlFor="relatorio-inicio">Data inicial</label><input id="relatorio-inicio" type="date" min="0001-01-01" max="9999-12-31" required value={form.inicio} onChange={e => setForm(atual => ({ ...atual, inicio: e.target.value }))} /></div>
            <div className="campo"><label htmlFor="relatorio-fim">Data final</label><input id="relatorio-fim" type="date" min="0001-01-01" max="9999-12-31" required value={form.fim} onChange={e => setForm(atual => ({ ...atual, fim: e.target.value }))} /></div>
            <button className="botao-primario" disabled={carregando}>Consultar período</button>
        </form>
        {erroPeriodo && <p className="mensagem erro" role="alert">{erroPeriodo}</p>}
        {pendente && <p className="relatorio-nota" role="status">As datas foram alteradas. Clique em Consultar período para aplicar o filtro.</p>}
        <p className="relatorio-nota">O filtro inclui todo o dia inicial e final. Vendas seguem o horário de São Paulo; aqui o período é por dia de calendário, sem o corte noturno do dashboard.</p>
        {carregando ? <p className="estado-vazio" role="status">Consultando o relatório…</p> : erro ? <div className="mensagem erro" role="alert"><p>{erro}</p><button className="atualizar" onClick={() => setConsulta(atual => ({ ...atual, revisao: atual.revisao + 1 }))}>Tentar novamente</button></div> : relatorio && <>
            <p className="painel-referencia">Período consultado: <strong>{dataNoite(relatorio.periodo.inicio)} a {dataNoite(relatorio.periodo.fim)}</strong></p>
            {semMovimentos && <p className="mensagem" role="status">Nenhuma movimentação encontrada no período.</p>}
            <div className="relatorio-indicadores">
                <section><h2>Receita total</h2><strong>{dinheiro(relatorio.total_receitas)}</strong><p>Soma das vendas registradas.</p></section>
                <section><h2>Custos totais</h2><strong>{dinheiro(relatorio.total_custos)}</strong><p>Compras de estoque + despesas operacionais.</p></section>
                <section className={negativo ? "resultado-negativo" : "resultado-positivo"}><h2>{negativo ? "Prejuízo do período" : "Resultado do período"}</h2><strong>{dinheiro(relatorio.resultado_periodo)}</strong><p>Receitas menos custos totais.</p></section>
            </div>
            <section className="bloco relatorio-resumo" aria-labelledby="dre-titulo"><div className="bloco-titulo"><h2 id="dre-titulo">DRE simplificado</h2></div><dl>
                <div><dt>Receita de vendas</dt><dd>{dinheiro(relatorio.total_receitas)}</dd></div>
                <div><dt>(−) Compras de estoque</dt><dd>{dinheiro(relatorio.total_compras_estoque)}</dd></div>
                <div><dt>(−) Despesas operacionais</dt><dd>{dinheiro(relatorio.total_despesas_operacionais)}</dd></div>
                <div className="relatorio-resultado"><dt>Resultado do período</dt><dd>{dinheiro(relatorio.resultado_periodo)}</dd></div>
            </dl></section>
            <Tabela titulo="Vendas" colunas={[{nome:"Venda"},{nome:"Data e horário"},{nome:"Responsável"},{nome:"Valor",numerico:true}]} linhas={relatorio.vendas.map(v => ({id:v.id_venda,valores:[`#${v.id_venda}`,exibirHorario(v.data_hora_venda),v.usuario?.nome_completo || "Não informado",dinheiro(v.valor_total)]}))} />
            <Tabela titulo="Compras de estoque" colunas={[{nome:"Entrada"},{nome:"Data"},{nome:"Produto"},{nome:"Quantidade",numerico:true},{nome:"Valor",numerico:true}]} linhas={relatorio.compras_estoque.map(c => ({id:c.id_estoque,valores:[`#${c.id_estoque}`,dataNoite(c.data_compra),c.produto?.nome_produto || "Não informado",numero(c.quantidade_adquirida),dinheiro(c.valor_total)]}))} />
            <Tabela titulo="Despesas operacionais" colunas={[{nome:"Despesa"},{nome:"Pagamento"},{nome:"Tipo"},{nome:"Responsável"},{nome:"Valor",numerico:true}]} linhas={relatorio.despesas_operacionais.map(d => ({id:d.id_despesa,valores:[`#${d.id_despesa}`,dataNoite(d.data_pagamento),tipos[d.tipo_despesa] || d.tipo_despesa,d.usuario?.nome_completo || "Não informado",dinheiro(d.valor)]}))} />
            <p className="relatorio-nota">Compras e despesas são somadas separadamente. Fichas de sinuca já fazem parte das vendas; reservas não geram receita.</p>
        </>}
    </main></div>;
}
