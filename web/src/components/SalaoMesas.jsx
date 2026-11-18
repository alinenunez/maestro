import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export const situacoesMesa = { disponivel: "Disponível", ocupada: "Ocupada", manutencao: "Manutenção" };

export default function SalaoMesas({ revisao, aoAlterar }) {
    const { consultar } = useAuth();
    const [mesas, setMesas] = useState(null);
    const [rascunhos, setRascunhos] = useState({});
    const [erroLista, setErroLista] = useState("");
    const [erro, setErro] = useState("");
    const [mensagem, setMensagem] = useState("");
    const [salvando, setSalvando] = useState(false);
    const trava = useRef(false);
    useEffect(() => {
        const controle = new AbortController();
        setMesas(null); setErroLista("");
        consultar("/mesas", { signal: controle.signal }).then(lista => {
            if (!controle.signal.aborted) { setMesas(lista); setRascunhos({}); }
        }).catch(erro => { if (!controle.signal.aborted) setErroLista(erro.message); });
        return () => controle.abort();
    }, [consultar, revisao]);

    async function salvar(mesa) {
        if (trava.current) return;
        trava.current = true; setSalvando(true); setErro(""); setMensagem("");
        try {
            await consultar(`/mesas/${mesa.id_mesa}`, { metodo: "PATCH", dados: { status: rascunhos[mesa.id_mesa] } });
            setMensagem(`Situação da mesa ${mesa.numero_mesa} atualizada.`); aoAlterar();
        } catch (erro) { setErro(erro.status ? erro.message : "Não foi possível confirmar a atualização. Atualize as mesas para conferir a situação."); }
        finally { trava.current = false; setSalvando(false); }
    }
    return <section className="salao-mesas" aria-labelledby="titulo-salao"><h2 id="titulo-salao">Situação atual do salão</h2>
        <p className="reserva-ajuda">Situação informada pelo atendente. A disponibilidade para reservar depende também da agenda.</p>
        {mensagem && <p className="mensagem sucesso" role="status">{mensagem}</p>}
        {erro && <p className="mensagem erro" role="alert">{erro}</p>}
        {erroLista ? <div role="alert" className="mensagem erro"><p>{erroLista}</p><button className="atualizar" disabled={salvando} onClick={aoAlterar}>Recarregar mesas</button></div>
            : !mesas ? <p className="reserva-ajuda" role="status">Carregando mesas…</p>
                : !mesas.length ? <p className="reserva-ajuda">Nenhuma mesa cadastrada. Fale com o administrador para cadastrar as mesas do salão.</p>
                    : <div className="salao-grade">{mesas.map(mesa => <article key={mesa.id_mesa} className="salao-mesa">
                        <div className={`mesa-desenho ${mesa.status}`}><strong>{String(mesa.numero_mesa).padStart(2, "0")}</strong><span>{situacoesMesa[mesa.status]}</span></div>
                        <label htmlFor={`situacao-${mesa.id_mesa}`}>Situação da mesa {mesa.numero_mesa}</label>
                        <select id={`situacao-${mesa.id_mesa}`} disabled={salvando} value={rascunhos[mesa.id_mesa] ?? mesa.status} onChange={e => setRascunhos(atual => ({ ...atual, [mesa.id_mesa]: e.target.value }))}>{Object.entries(situacoesMesa).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select>
                        <button className="atualizar" disabled={salvando || !rascunhos[mesa.id_mesa] || rascunhos[mesa.id_mesa] === mesa.status} onClick={() => salvar(mesa)}>Salvar mesa {mesa.numero_mesa}</button>
                    </article>)}</div>}
        <p className="reserva-ajuda">Alterar a situação não cancela reservas existentes. Ao colocar uma mesa em manutenção, confira sua agenda.</p>
    </section>;
}
