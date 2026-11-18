import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import CabecalhoPainel from "../components/CabecalhoPainel";
import { useAuth } from "../contexts/AuthContext";
import { dataNoite, dinheiro, numero } from "../utils/formatacao";
import { centavos, reais } from "../utils/calculoVenda";
import { paraCampo } from "../utils/horariosReserva";
import "../dashboard.css";
import "../despesas.css";

const tipos = { manutencao: "Manutenção", energia: "Energia", agua: "Água", limpeza: "Limpeza", outros: "Outros" };
const formularioInicial = () => ({ tipo_despesa: "", valor: "", data_pagamento: paraCampo(new Date()).slice(0, 10) });

export default function Despesas() {
    const { usuario } = useAuth();
    // Não monta o conteúdo nem consulta despesas quando o perfil não tem acesso.
    return usuario?.tipo_acesso === "administrador" ? <ConteudoDespesas /> : <Navigate to="/dashboard" replace />;
}

function ConteudoDespesas() {
    const { consultar, usuario } = useAuth();
    const [despesas, setDespesas] = useState(null);
    const [erroLista, setErroLista] = useState("");
    const [revisao, setRevisao] = useState(0);
    const [form, setForm] = useState(formularioInicial);
    const [ocupado, setOcupado] = useState(false);
    const [incerto, setIncerto] = useState(false);
    const [erro, setErro] = useState("");
    const [mensagem, setMensagem] = useState("");
    const trava = useRef(false);
    const atualizar = () => setRevisao(atual => atual + 1);

    useEffect(() => {
        const controle = new AbortController();
        setDespesas(null); setErroLista("");
        consultar("/despesas", { signal: controle.signal })
            .then(lista => { if (!controle.signal.aborted) setDespesas(lista); })
            .catch(falha => { if (!controle.signal.aborted) setErroLista(falha.message); });
        return () => controle.abort();
    }, [consultar, revisao]);

    const total = despesas?.reduce((soma, despesa) => soma + centavos(despesa.valor), 0n);
    const mudar = (campo, valor) => setForm(atual => ({ ...atual, [campo]: valor }));

    async function registrar(evento) {
        evento.preventDefault();
        if (trava.current || incerto) return;
        setErro(""); setMensagem("");
        const valor = form.valor.trim().replace(",", ".");
        const valorCentavos = centavos(valor);
        if (valorCentavos === null || valorCentavos <= 0n) {
            setErro("Informe um valor maior que zero, com até 10 dígitos inteiros e 2 decimais, como 250,75. Não use separador de milhar."); return;
        }
        if (!Object.hasOwn(tipos, form.tipo_despesa)) { setErro("Selecione o tipo de despesa."); return; }
        const data = new Date(`${form.data_pagamento}T00:00:00Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(form.data_pagamento) || form.data_pagamento.startsWith("0000") || Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== form.data_pagamento) {
            setErro("Informe uma data de pagamento válida."); return;
        }
        trava.current = true; setOcupado(true);
        try {
            const criada = await consultar("/despesas", { metodo: "POST", dados: {
                tipo_despesa: form.tipo_despesa, valor: reais(valorCentavos), data_pagamento: form.data_pagamento,
            } });
            setMensagem(`Despesa #${criada.id_despesa} registrada com sucesso.`);
            setForm(formularioInicial());
            atualizar();
        } catch (falha) {
            // Sem uma resposta conclusiva, não repetir um lançamento financeiro automaticamente.
            if (!falha.status || falha.status >= 500) {
                setIncerto(true); atualizar();
                setErro("Não foi possível confirmar o resultado do envio. Confira o histórico antes de tentar registrar novamente, pois a despesa pode ter sido salva.");
            } else setErro(falha.message);
        } finally { trava.current = false; setOcupado(false); }
    }

    return <div className="dashboard-layout"><CabecalhoPainel /><main className="painel-conteudo">
        <div className="painel-titulo"><div><p className="sobretitulo">CUSTOS OPERACIONAIS</p><h1>Registro de despesas</h1><p>Pagamentos de manutenção, energia, água, limpeza e outros custos do bar.</p></div>
            <button className="atualizar" disabled={ocupado} onClick={atualizar}>Atualizar</button>
        </div>
        {mensagem && <p className="mensagem sucesso" role="status">{mensagem}</p>}
        <div className="despesas-layout">
            <section aria-labelledby="titulo-despesas">
                <div className="despesas-total"><span>Total de despesas listadas<small>Todos os registros, sem filtro de período.</small></span><strong>{despesas ? dinheiro(reais(total)) : "—"}</strong></div>
                <div className="bloco"><div className="bloco-titulo"><div><h2 id="titulo-despesas">Histórico de despesas</h2><p>Pagamentos mais recentes primeiro.</p></div>{despesas && <span className="contador">{numero(despesas.length)} registro(s)</span>}</div>
                    {erroLista ? <div className="estado-vazio" role="alert"><p>{erroLista}</p><button className="atualizar" onClick={atualizar} disabled={ocupado}>Tentar novamente</button></div>
                        : !despesas ? <p className="estado-vazio" role="status">Carregando despesas…</p>
                            : !despesas.length ? <div className="estado-vazio"><h3>Nenhuma despesa registrada</h3><p>Registre o primeiro pagamento no formulário.</p></div>
                                : <div className="tabela-container" role="region" aria-label="Histórico de despesas" tabIndex="0"><table>
                                    <thead><tr><th scope="col">Pagamento</th><th scope="col">Tipo de despesa</th><th scope="col" className="numerico">Valor</th><th scope="col">Responsável</th></tr></thead>
                                    <tbody>{despesas.map(despesa => <tr key={despesa.id_despesa}>
                                        <td className="despesa-data">{dataNoite(despesa.data_pagamento)}<small>#{despesa.id_despesa}</small></td>
                                        <td>{tipos[despesa.tipo_despesa] || despesa.tipo_despesa}</td>
                                        <td className="numerico">{dinheiro(despesa.valor)}</td>
                                        <td>{despesa.usuario?.nome_completo || "Não informado"}</td>
                                    </tr>)}</tbody>
                                </table></div>}
                </div>
                <p className="despesas-nota">Compras de produtos são registradas em Estoque. Não lance novamente aqui uma compra já registrada lá.</p>
            </section>
            <section className="despesas-editor" aria-labelledby="titulo-nova-despesa">
                <h2 id="titulo-nova-despesa">Nova despesa</h2><p className="despesas-ajuda">Informe o tipo, o valor e a data do pagamento.</p>
                <form onSubmit={registrar} aria-busy={ocupado}><fieldset disabled={ocupado || incerto}>
                    <div className="campo"><label htmlFor="despesa-tipo">Tipo de despesa</label><select id="despesa-tipo" required value={form.tipo_despesa} onChange={e => mudar("tipo_despesa", e.target.value)}><option value="">Selecione o tipo</option>{Object.entries(tipos).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}</select></div>
                    <div className="campo"><label htmlFor="despesa-valor">Valor (R$)</label><input id="despesa-valor" inputMode="decimal" maxLength={13} placeholder="250,75" required value={form.valor} onChange={e => mudar("valor", e.target.value)} aria-describedby="ajuda-valor-despesa" /><p id="ajuda-valor-despesa" className="despesas-ajuda">Use vírgula ou ponto para os centavos, sem separador de milhar.</p></div>
                    <div className="campo"><label htmlFor="despesa-data">Data do pagamento</label><input id="despesa-data" type="date" min="0001-01-01" max="9999-12-31" required value={form.data_pagamento} onChange={e => mudar("data_pagamento", e.target.value)} /></div>
                    <p className="despesas-ajuda">Responsável: <strong>{usuario.nome_completo}</strong></p>
                    <button className="botao-primario">{ocupado ? "Salvando…" : "Salvar despesa"}</button>
                </fieldset></form>
                {erro && <p className="mensagem erro" role="alert">{erro}</p>}
                {incerto && <button className="atualizar" disabled={!despesas || ocupado} onClick={() => { setIncerto(false); setErro(""); }}>Já conferi o histórico: revisar formulário</button>}
            </section>
        </div>
    </main></div>;
}
