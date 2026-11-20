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
    const [editando, setEditando] = useState(null);
    const [ocupado, setOcupado] = useState(false);
    const [incerto, setIncerto] = useState(false);
    const [erro, setErro] = useState("");
    const [mensagem, setMensagem] = useState("");
    const trava = useRef(false);
    const campoTipo = useRef(null);
    const atualizar = () => setRevisao(atual => atual + 1);

    useEffect(() => {
        if (editando && !ocupado) campoTipo.current?.focus();
    }, [editando, ocupado]);

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
    function limparFormulario() {
        setEditando(null); setForm(formularioInicial());
    }

    function tratarFalha(falha) {
        if (!falha.status || falha.status >= 500) {
            setIncerto(true); atualizar();
            setErro("Não foi possível confirmar o resultado. A alteração pode ter sido salva. Confira o histórico antes de continuar; o envio não será repetido automaticamente.");
        } else {
            setErro(falha.message);
            if (falha.status === 404) { limparFormulario(); atualizar(); }
        }
    }

    async function editar(despesa) {
        if (trava.current || incerto) return;
        trava.current = true; setOcupado(true); setErro(""); setMensagem("");
        try {
            const atual = await consultar(`/despesas/${despesa.id_despesa}`);
            setForm({ tipo_despesa: atual.tipo_despesa, valor: String(atual.valor).replace(".", ","), data_pagamento: atual.data_pagamento });
            setEditando(atual);
        } catch (falha) {
            setErro(falha.message);
            if (falha.status === 404) { limparFormulario(); atualizar(); }
        } finally { trava.current = false; setOcupado(false); }
    }

    async function excluir(despesa) {
        if (trava.current || incerto) return;
        if (!window.confirm(`Excluir a despesa #${despesa.id_despesa} de ${tipos[despesa.tipo_despesa] || despesa.tipo_despesa}, no valor de ${dinheiro(despesa.valor)}, paga em ${dataNoite(despesa.data_pagamento)}?\n\nA exclusão é permanente e remove esse valor dos relatórios financeiros.`)) return;
        trava.current = true; setOcupado(true); setErro(""); setMensagem("");
        try {
            await consultar(`/despesas/${despesa.id_despesa}`, { metodo: "DELETE" });
            if (editando?.id_despesa === despesa.id_despesa) limparFormulario();
            setMensagem(`Despesa #${despesa.id_despesa} excluída com sucesso.`);
            atualizar();
        } catch (falha) { tratarFalha(falha); }
        finally { trava.current = false; setOcupado(false); }
    }

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
        const dados = { tipo_despesa: form.tipo_despesa, valor: reais(valorCentavos), data_pagamento: form.data_pagamento };
        if (editando) {
            if (dados.tipo_despesa === editando.tipo_despesa) delete dados.tipo_despesa;
            if (valorCentavos === centavos(editando.valor)) delete dados.valor;
            if (dados.data_pagamento === editando.data_pagamento) delete dados.data_pagamento;
            if (!Object.keys(dados).length) { setMensagem("Nenhum dado da despesa foi alterado."); return; }
        }
        trava.current = true; setOcupado(true);
        try {
            const salva = await consultar(editando ? `/despesas/${editando.id_despesa}` : "/despesas", {
                metodo: editando ? "PATCH" : "POST", dados,
            });
            setMensagem(`Despesa #${salva.id_despesa} ${editando ? "atualizada" : "registrada"} com sucesso.`);
            limparFormulario();
            atualizar();
        } catch (falha) {
            tratarFalha(falha);
        } finally { trava.current = false; setOcupado(false); }
    }

    return <div className="dashboard-layout"><CabecalhoPainel /><main className="painel-conteudo">
        <div className="painel-titulo"><div><p className="sobretitulo">CUSTOS OPERACIONAIS</p><h1>Registro de despesas</h1><p>Pagamentos de manutenção, energia, água, limpeza e outros custos do bar.</p></div>
            <button className="atualizar" disabled={ocupado} onClick={atualizar}>Atualizar</button>
        </div>
        {mensagem && <p className="mensagem sucesso" role="status">{mensagem}</p>}
        {erro && <p className="mensagem erro" role="alert">{erro}</p>}
        {incerto && <button className="atualizar despesas-revisar" disabled={!despesas || ocupado} onClick={() => { setIncerto(false); setErro(""); limparFormulario(); }}>Já conferi o histórico: iniciar novo formulário</button>}
        <div className="despesas-layout">
            <section aria-labelledby="titulo-despesas">
                <div className="despesas-total"><span>Total de despesas listadas<small>Todos os registros, sem filtro de período.</small></span><strong>{despesas ? dinheiro(reais(total)) : "—"}</strong></div>
                <div className="bloco"><div className="bloco-titulo"><div><h2 id="titulo-despesas">Histórico de despesas</h2><p>Pagamentos mais recentes primeiro.</p></div>{despesas && <span className="contador">{numero(despesas.length)} registro(s)</span>}</div>
                    {erroLista ? <div className="estado-vazio" role="alert"><p>{erroLista}</p><button className="atualizar" onClick={atualizar} disabled={ocupado}>Tentar novamente</button></div>
                        : !despesas ? <p className="estado-vazio" role="status">Carregando despesas…</p>
                            : !despesas.length ? <div className="estado-vazio"><h3>Nenhuma despesa registrada</h3><p>Registre o primeiro pagamento no formulário.</p></div>
                                : <div className="tabela-container" role="region" aria-label="Histórico de despesas" tabIndex="0"><table>
                                    <thead><tr><th scope="col">Pagamento</th><th scope="col">Tipo de despesa</th><th scope="col" className="numerico">Valor</th><th scope="col">Responsável</th><th scope="col">Ações</th></tr></thead>
                                    <tbody>{despesas.map(despesa => <tr key={despesa.id_despesa}>
                                        <td className="despesa-data">{dataNoite(despesa.data_pagamento)}<small>#{despesa.id_despesa}</small></td>
                                        <td>{tipos[despesa.tipo_despesa] || despesa.tipo_despesa}</td>
                                        <td className="numerico">{dinheiro(despesa.valor)}</td>
                                        <td>{despesa.usuario?.nome_completo || "Não informado"}</td>
                                        <td><div className="despesas-acoes">
                                            <button className="atualizar" type="button" disabled={ocupado || incerto} onClick={() => editar(despesa)} aria-label={`Editar despesa #${despesa.id_despesa}`}>Editar</button>
                                            <button className="atualizar despesa-excluir" type="button" disabled={ocupado || incerto} onClick={() => excluir(despesa)} aria-label={`Excluir despesa #${despesa.id_despesa}`}>Excluir</button>
                                        </div></td>
                                    </tr>)}</tbody>
                                </table></div>}
                </div>
                <p className="despesas-nota">Compras de produtos são registradas em Estoque. Não lance novamente aqui uma compra já registrada lá.</p>
            </section>
            <section className="despesas-editor" aria-labelledby="titulo-nova-despesa">
                <h2 id="titulo-nova-despesa">{editando ? `Editar despesa #${editando.id_despesa}` : "Nova despesa"}</h2><p className="despesas-ajuda">Informe o tipo, o valor e a data do pagamento.</p>
                <form onSubmit={registrar} aria-busy={ocupado}><fieldset disabled={ocupado || incerto}>
                    <div className="campo"><label htmlFor="despesa-tipo">Tipo de despesa</label><select ref={campoTipo} id="despesa-tipo" required value={form.tipo_despesa} onChange={e => mudar("tipo_despesa", e.target.value)}><option value="">Selecione o tipo</option>{Object.entries(tipos).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}</select></div>
                    <div className="campo"><label htmlFor="despesa-valor">Valor (R$)</label><input id="despesa-valor" inputMode="decimal" maxLength={13} placeholder="250,75" required value={form.valor} onChange={e => mudar("valor", e.target.value)} aria-describedby="ajuda-valor-despesa" /><p id="ajuda-valor-despesa" className="despesas-ajuda">Use vírgula ou ponto para os centavos, sem separador de milhar.</p></div>
                    <div className="campo"><label htmlFor="despesa-data">Data do pagamento</label><input id="despesa-data" type="date" min="0001-01-01" max="9999-12-31" required value={form.data_pagamento} onChange={e => mudar("data_pagamento", e.target.value)} /></div>
                    <p className="despesas-ajuda">{editando ? "Registrada por" : "Responsável"}: <strong>{editando ? editando.usuario?.nome_completo || "Não informado" : usuario.nome_completo}</strong></p>
                    <button className="botao-primario">{ocupado ? "Aguarde…" : editando ? "Salvar alterações" : "Salvar despesa"}</button>
                    {editando && <button className="atualizar despesa-cancelar" type="button" onClick={() => { limparFormulario(); setErro(""); setMensagem(""); }}>Cancelar edição</button>}
                </fieldset></form>
            </section>
        </div>
    </main></div>;
}
