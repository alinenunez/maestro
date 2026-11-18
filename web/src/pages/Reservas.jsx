import { useCallback, useEffect, useRef, useState } from "react";
import CabecalhoPainel from "../components/CabecalhoPainel";
import SalaoMesas, { situacoesMesa } from "../components/SalaoMesas";
import { useAuth } from "../contexts/AuthContext";
import { paraCampo, periodoReserva, periodoDia, exibirHorario } from "../utils/horariosReserva";
import "../dashboard.css";
import "../reservas.css";

const vazio = { nome_cliente: "", telefone_cliente: "", inicio: "", duracao_minutos: "60", mesas: [] };

export default function Reservas() {
    const { consultar } = useAuth();
    const [revisao, setRevisao] = useState(0);
    const [dia, setDia] = useState(() => paraCampo(new Date()).slice(0, 10));
    const [reservas, setReservas] = useState(null);
    const [erroLista, setErroLista] = useState("");
    const [form, setForm] = useState(vazio);
    const [original, setOriginal] = useState(null);
    const [consulta, setConsulta] = useState(null);
    const [consultando, setConsultando] = useState(false);
    const [erroConsulta, setErroConsulta] = useState("");
    const [erro, setErro] = useState("");
    const [mensagem, setMensagem] = useState("");
    const [ocupado, setOcupado] = useState(false);
    const [incerto, setIncerto] = useState(false);
    const [cancelamento, setCancelamento] = useState(null);
    const [erroCancelar, setErroCancelar] = useState("");
    const trava = useRef(false);
    const busca = useRef(null);
    const nomeInput = useRef(null);
    const dialogo = useRef(null);
    const atualizar = useCallback(() => setRevisao(n => n + 1), []);

    function invalidarConsulta() {
        busca.current?.abort(); setConsulta(null); setConsultando(false); setErroConsulta("");
    }
    useEffect(() => { invalidarConsulta(); }, [revisao]);
    useEffect(() => () => busca.current?.abort(), []);
    useEffect(() => {
        const controle = new AbortController();
        setReservas(null); setErroLista("");
        let query = "";
        try { if (dia) query = `?${new URLSearchParams(periodoDia(dia))}`; }
        catch (erro) { setErroLista(erro.message); return; }
        consultar(`/reservas${query}`, { signal: controle.signal })
            .then(lista => { if (!controle.signal.aborted) setReservas(lista); })
            .catch(erro => { if (!controle.signal.aborted) setErroLista(erro.message); });
        return () => controle.abort();
    }, [consultar, dia, revisao]);
    useEffect(() => { if (original && !ocupado) nomeInput.current?.focus(); }, [original, ocupado]);

    function iniciar() { if (trava.current) return false; trava.current = true; setOcupado(true); return true; }
    function terminar() { trava.current = false; setOcupado(false); }
    function limpar() { invalidarConsulta(); setOriginal(null); setForm(vazio); setErro(""); setIncerto(false); }
    function mudar(campo, valor) {
        if (campo === "inicio" || campo === "duracao_minutos") invalidarConsulta();
        setForm(atual => ({ ...atual, [campo]: valor }));
    }
    async function disponibilidade() {
        invalidarConsulta();
        let periodo;
        try { periodo = periodoReserva(form.inicio, form.duracao_minutos); }
        catch (erro) { setErroConsulta(erro.message); return; }
        const controle = new AbortController(); busca.current = controle; setConsultando(true);
        const query = new URLSearchParams(periodo);
        try {
            const [mesas, sobrepostas] = await Promise.all([
                consultar(`/reservas/disponibilidade?${query}`, { signal: controle.signal }),
                original ? consultar(`/reservas?${query}`, { signal: controle.signal }) : Promise.resolve([]),
            ]);
            if (controle.signal.aborted) return;
            // Na edicao, desconta somente a propria reserva; outras reservas seguem bloqueando a mesa.
            const outras = new Set(sobrepostas.filter(r => r.id_reserva !== original?.id_reserva).flatMap(r => r.mesas.map(m => m.id_mesa)));
            setConsulta({ periodo, mesas: mesas.map(mesa => original ? { ...mesa, tem_reserva: outras.has(mesa.id_mesa), disponivel_para_reserva: mesa.status_atual !== "manutencao" && !outras.has(mesa.id_mesa) } : mesa) });
        } catch (erro) { if (!controle.signal.aborted) setErroConsulta(erro.message); }
        finally { if (!controle.signal.aborted) setConsultando(false); }
    }

    async function editar(id) {
        if (incerto || !iniciar()) return;
        invalidarConsulta(); setErro(""); setMensagem("");
        try {
            const reserva = await consultar(`/reservas/${id}`);
            setOriginal(reserva);
            setForm({ nome_cliente: reserva.nome_cliente, telefone_cliente: reserva.telefone_cliente, inicio: paraCampo(reserva.data_horario_reserva), duracao_minutos: String(reserva.duracao_minutos), mesas: reserva.mesas.map(m => m.id_mesa) });
        } catch (erro) { setErro(erro.message); }
        finally { terminar(); }
    }

    async function salvar(evento) {
        evento.preventDefault();
        if (trava.current || incerto) return;
        setErro(""); setMensagem("");
        let dados;
        try {
            const periodo = periodoReserva(form.inicio, form.duracao_minutos);
            if (!form.nome_cliente.trim()) throw new Error("Informe o nome do cliente.");
            const telefone = form.telefone_cliente.trim();
            if (!/^\+?[0-9() .-]+$/.test(telefone) || !/^\d{8,15}$/.test(telefone.replace(/\D/g, ""))) throw new Error("Informe um telefone com 8 a 15 dígitos.");
            if (!consulta || consulta.periodo.inicio !== periodo.inicio || consulta.periodo.fim !== periodo.fim) throw new Error("Consulte a disponibilidade para o horário e a duração informados.");
            if (!form.mesas.length) throw new Error("Selecione pelo menos uma mesa.");
            if (form.mesas.some(id => !consulta.mesas.some(m => m.id_mesa === id && m.disponivel_para_reserva))) throw new Error("A seleção contém mesa indisponível. Revise as mesas selecionadas.");
            dados = { nome_cliente: form.nome_cliente.trim(), telefone_cliente: telefone, data_horario_reserva: periodo.inicio, duracao_minutos: Number(form.duracao_minutos), mesas: form.mesas };
            if (original) {
                const iguais = (a, b) => JSON.stringify([...a].sort((x,y) => x-y)) === JSON.stringify([...b].sort((x,y) => x-y));
                for (const campo of Object.keys(dados)) {
                    const igual = campo === "mesas" ? iguais(dados.mesas, original.mesas.map(m => m.id_mesa)) : campo === "data_horario_reserva" ? new Date(dados[campo]).getTime() === new Date(original[campo]).getTime() : dados[campo] === original[campo];
                    if (igual) delete dados[campo];
                }
                if (!Object.keys(dados).length) { setMensagem("Nenhuma alteração para salvar."); return; }
            }
        } catch (erro) { setErro(erro.message); return; }
        if (!iniciar()) return;
        try {
            const registro = await consultar(original ? `/reservas/${original.id_reserva}` : "/reservas", { metodo: original ? "PATCH" : "POST", dados });
            setMensagem(`Reserva #${registro.id_reserva} ${original ? "atualizada" : "registrada"} para ${registro.nome_cliente}.`);
            setDia(paraCampo(registro.data_horario_reserva).slice(0,10)); limpar(); atualizar();
        } catch (erro) {
            if (!erro.status || erro.status >= 500) { setIncerto(true); setErro("Não foi possível confirmar o resultado. Confira a agenda antes de tentar novamente."); atualizar(); }
            else { setErro(erro.message); if (erro.status === 409) invalidarConsulta(); }
        } finally { terminar(); }
    }

    function pedirCancelamento(reserva) { setCancelamento(reserva); setErroCancelar(""); dialogo.current.showModal(); }
    async function cancelar() {
        if (!iniciar()) return;
        setErroCancelar("");
        try {
            await consultar(`/reservas/${cancelamento.id_reserva}`, { metodo: "DELETE" });
            if (original?.id_reserva === cancelamento.id_reserva) limpar();
            setMensagem(`Reserva #${cancelamento.id_reserva} cancelada.`); dialogo.current.close(); atualizar();
        } catch (erro) { setErroCancelar(erro.status ? erro.message : "Não foi possível confirmar o cancelamento. Feche esta janela e atualize a agenda para conferir."); }
        finally { terminar(); }
    }

    return <div className="dashboard-layout"><CabecalhoPainel /><main className="painel-conteudo reservas-pagina">
        <div className="painel-titulo"><div><p className="sobretitulo">AGENDA E ORGANIZAÇÃO DO SALÃO</p><h1>Reservas de mesas de sinuca</h1><p>Uma reserva pode incluir várias mesas. Horários de São Paulo.</p></div><button className="atualizar" disabled={ocupado} onClick={atualizar}>Atualizar</button></div>
        {mensagem && <p className="mensagem sucesso" role="status">{mensagem}</p>}
        <div className="reservas-layout">
            <SalaoMesas revisao={revisao} aoAlterar={atualizar} />
            <section className="bloco agenda-reservas" id="agenda-reservas" aria-labelledby="titulo-agenda">
                <div className="bloco-titulo"><div><h2 id="titulo-agenda">Agenda de reservas</h2><p>Reservas que ocupam algum horário do dia escolhido.</p></div></div>
                <div className="agenda-filtro"><label htmlFor="dia-agenda">Dia da agenda</label><input id="dia-agenda" type="date" min="0001-01-01" max="9998-12-31" value={dia} onChange={e => setDia(e.target.value)} /><button className="atualizar" onClick={() => setDia("")}>Ver todas</button>{!dia && <p>Todas as reservas, por ordem de início.</p>}</div>
                {erroLista ? <div className="estado-vazio" role="alert"><p>{erroLista}</p><button className="atualizar" onClick={atualizar}>Tentar novamente</button></div>
                    : !reservas ? <p className="estado-vazio" role="status">Carregando reservas…</p>
                        : !reservas.length ? <div className="estado-vazio"><h3>Nenhuma reserva encontrada</h3><p>Escolha outro dia ou registre uma nova reserva.</p></div>
                            : <ul className="lista-reservas">{reservas.map(reserva => <li key={reserva.id_reserva}>
                                <strong>{reserva.nome_cliente}</strong><span>Reserva #{reserva.id_reserva} · {reserva.telefone_cliente}</span>
                                <p>Mesas: {reserva.mesas.map(m => m.numero_mesa).join(", ")}</p><p>Início: {exibirHorario(reserva.data_horario_reserva)}</p><p>Fim: {exibirHorario(reserva.data_horario_fim)}</p>
                                <div className="reserva-acoes"><button disabled={ocupado || incerto} onClick={() => editar(reserva.id_reserva)} aria-label={`Editar reserva ${reserva.id_reserva}`}>Editar</button><button disabled={ocupado || incerto} onClick={() => pedirCancelamento(reserva)} aria-label={`Cancelar reserva ${reserva.id_reserva}`}>Cancelar reserva</button></div>
                            </li>)}</ul>}
            </section>
            <section className="reserva-editor" aria-labelledby="titulo-reserva"><h2 id="titulo-reserva">{original ? `Editar reserva #${original.id_reserva}` : "Nova reserva"}</h2>
                <form onSubmit={salvar}><fieldset disabled={ocupado || incerto}>
                    <div className="campo"><label htmlFor="cliente-reserva">Nome completo do cliente</label><input id="cliente-reserva" ref={nomeInput} required maxLength={150} value={form.nome_cliente} onChange={e => mudar("nome_cliente", e.target.value)} placeholder="Nome e sobrenome" /></div>
                    <div className="campo"><label htmlFor="telefone-reserva">Telefone / WhatsApp</label><input id="telefone-reserva" type="tel" required maxLength={20} value={form.telefone_cliente} onChange={e => mudar("telefone_cliente", e.target.value)} placeholder="(51) 99999-1234" /></div>
                    <div className="campo"><label htmlFor="inicio-reserva">Data e horário de início</label><input id="inicio-reserva" type="datetime-local" step={form.inicio.length > 19 ? "0.001" : form.inicio.length > 16 ? "1" : "60"} min="0001-01-01T00:00" max="9999-12-31T23:59" required value={form.inicio} onChange={e => mudar("inicio", e.target.value)} /></div>
                    <div className="campo"><label htmlFor="duracao-reserva">Duração (minutos)</label><input id="duracao-reserva" type="number" min="1" max="2147483647" step="1" required value={form.duracao_minutos} onChange={e => mudar("duracao_minutos", e.target.value)} /></div>
                    <button className="atualizar consultar-mesas" type="button" disabled={consultando} onClick={disponibilidade}>{consultando ? "Consultando…" : "Consultar disponibilidade"}</button>
                    {erroConsulta && <p className="mensagem erro" role="alert">{erroConsulta}</p>}
                    {consulta && <div className="selecao-mesas"><p className="reserva-ajuda">Período: {exibirHorario(consulta.periodo.inicio)} até {exibirHorario(consulta.periodo.fim)}.</p><p className="reserva-ajuda">Selecione uma ou mais mesas:</p>
                        {!consulta.mesas.length && <p className="reserva-ajuda">Nenhuma mesa cadastrada.</p>}
                        {consulta.mesas.map(mesa => <label key={mesa.id_mesa} className={`mesa-opcao ${mesa.disponivel_para_reserva ? "" : "indisponivel"}`}><input type="checkbox" checked={form.mesas.includes(mesa.id_mesa)} disabled={!mesa.disponivel_para_reserva && !form.mesas.includes(mesa.id_mesa)} onChange={e => mudar("mesas", e.target.checked ? [...form.mesas, mesa.id_mesa] : form.mesas.filter(id => id !== mesa.id_mesa))} /><span><strong>Mesa {mesa.numero_mesa}</strong><small>{mesa.status_atual === "manutencao" ? "Em manutenção" : mesa.tem_reserva ? "Já reservada neste período" : "Livre para reservar neste período"} · Agora: {situacoesMesa[mesa.status_atual]}</small></span></label>)}
                        <button type="button" className="reserva-link" onClick={() => mudar("mesas", [])}>Limpar seleção</button>
                    </div>}
                    <p className="reserva-ajuda">A situação atual não determina a disponibilidade em horários futuros. Reservar não altera o status da mesa nem registra uma venda.</p>
                    <button className="botao-primario" disabled={!consulta || consultando}>{ocupado ? "Salvando…" : original ? "Salvar alterações" : "Registrar reserva"}</button>
                </fieldset></form>
                {erro && <p className="mensagem erro" role="alert">{erro}</p>}
                {incerto && <div className="reserva-incerta"><a href="#agenda-reservas">Consultar agenda</a><button className="atualizar" onClick={() => { setIncerto(false); setErro(""); }}>Já conferi a agenda: revisar formulário</button></div>}
                <button className="reserva-link" disabled={ocupado} onClick={limpar}>{original ? "Sair da edição" : "Limpar formulário"}</button>
            </section>
        </div>
        <dialog className="reserva-dialogo" ref={dialogo} aria-labelledby="titulo-cancelar" onCancel={e => { if (ocupado) e.preventDefault(); }}><h2 id="titulo-cancelar">Cancelar reserva?</h2><p>{cancelamento?.nome_cliente} · Reserva #{cancelamento?.id_reserva}</p><p>As mesas serão liberadas na agenda. A reserva será excluída, sem histórico de cancelamento.</p>{erroCancelar && <p className="mensagem erro" role="alert">{erroCancelar}</p>}<div className="reserva-acoes"><button autoFocus disabled={ocupado} onClick={() => dialogo.current.close()}>Voltar</button><button disabled={ocupado} onClick={cancelar}>{ocupado ? "Cancelando…" : "Confirmar cancelamento"}</button></div></dialog>
    </main></div>;
}
