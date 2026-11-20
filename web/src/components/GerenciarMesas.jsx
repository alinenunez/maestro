import { useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function GerenciarMesas({ mesas, bloqueado, aoAlterar, aoOcupar }) {
    const { consultar, usuario } = useAuth();
    const [aberto, setAberto] = useState(false);
    const [id, setId] = useState("");
    const [numero, setNumero] = useState("");
    const [status, setStatus] = useState("disponivel");
    const [ocupado, setOcupado] = useState(false);
    const [incerto, setIncerto] = useState(false);
    const [erro, setErro] = useState("");
    const [mensagem, setMensagem] = useState("");
    const trava = useRef(false);
    if (usuario.tipo_acesso !== "administrador") return null;
    const selecionada = mesas?.find(m => String(m.id_mesa) === id);
    const limpar = () => { setId(""); setNumero(""); setStatus("disponivel"); setErro(""); setIncerto(false); };
    function selecionar(valor) {
        const mesa = mesas.find(m => String(m.id_mesa) === valor);
        setId(valor); setNumero(mesa ? String(mesa.numero_mesa) : ""); setStatus("disponivel"); setErro(""); setMensagem("");
    }
    async function gravar(excluir = false) {
        if (trava.current || bloqueado || incerto) return;
        setErro(""); setMensagem("");
        if (id && !selecionada) { setErro("A mesa não está mais na lista. Atualize e escolha outra."); return; }
        if (!excluir && (!/^[1-9][0-9]*$/.test(numero) || Number(numero) > 2147483647)) { setErro("Informe um número inteiro entre 1 e 2147483647."); return; }
        if (!excluir && mesas.some(m => m.numero_mesa === Number(numero) && String(m.id_mesa) !== id)) { setErro("Já existe uma mesa com esse número."); return; }
        if (excluir && !selecionada) return;
        if (excluir && !window.confirm(`Excluir a mesa ${selecionada.numero_mesa}? A exclusão é permanente. Mesas vinculadas a reservas não podem ser excluídas.`)) return;
        if (!excluir && selecionada?.numero_mesa === Number(numero)) { setMensagem("O número da mesa não foi alterado."); return; }
        trava.current = true; setOcupado(true); aoOcupar(true);
        try {
            await consultar(id ? `/mesas/${id}` : "/mesas", {
                metodo: excluir ? "DELETE" : id ? "PATCH" : "POST",
                dados: excluir ? undefined : id ? { numero_mesa: Number(numero) } : { numero_mesa: Number(numero), status },
            });
            setMensagem(excluir ? "Mesa excluída." : id ? "Número da mesa atualizado." : "Mesa cadastrada com sucesso.");
            limpar(); aoAlterar();
        } catch (falha) {
            if (!falha.status || falha.status >= 500) {
                setIncerto(true); setErro("Não foi possível confirmar o resultado. Confira a lista atualizada antes de fazer outra alteração."); aoAlterar();
            } else setErro(falha.message);
        } finally { trava.current = false; setOcupado(false); aoOcupar(false); }
    }
    return <div className="gerenciar-mesas">
        <button type="button" className="atualizar" aria-expanded={aberto} aria-controls="cadastro-mesas" disabled={ocupado || bloqueado} onClick={() => { setAberto(!aberto); limpar(); setMensagem(""); }}>{aberto ? "Fechar gerenciamento" : "Gerenciar mesas"}</button>
        {aberto && <section id="cadastro-mesas" aria-labelledby="titulo-cadastro-mesas"><h3 id="titulo-cadastro-mesas">Cadastro de mesas</h3>
            <p className="reserva-ajuda">Alterar o número preserva os vínculos com as reservas. A situação atual continua sendo alterada no salão.</p>
            {mensagem && <p className="mensagem sucesso" role="status">{mensagem}</p>}
            {erro && <p className="mensagem erro" role="alert">{erro}</p>}
            <form onSubmit={e => { e.preventDefault(); gravar(); }}><fieldset disabled={ocupado || bloqueado || incerto || !mesas}>
                <div className="campo"><label htmlFor="cadastro-mesa">Mesa</label><select id="cadastro-mesa" value={id} onChange={e => selecionar(e.target.value)}><option value="">Nova mesa</option>{(mesas || []).map(m => <option key={m.id_mesa} value={m.id_mesa}>Mesa {m.numero_mesa}</option>)}</select></div>
                <div className="campo"><label htmlFor="numero-mesa">Número da mesa</label><input id="numero-mesa" type="number" min="1" max="2147483647" step="1" required value={numero} onChange={e => setNumero(e.target.value)} /></div>
                {!id && <div className="campo"><label htmlFor="status-nova-mesa">Situação inicial</label><select id="status-nova-mesa" value={status} onChange={e => setStatus(e.target.value)}><option value="disponivel">Disponível</option><option value="ocupada">Ocupada</option><option value="manutencao">Manutenção</option></select></div>}
                <button className="botao-primario">{ocupado ? "Aguarde…" : id ? "Salvar número" : "Cadastrar mesa"}</button>
                {selecionada && <button className="mesa-excluir" type="button" onClick={() => gravar(true)}>Excluir mesa {selecionada.numero_mesa}</button>}
            </fieldset></form>
            {incerto && <button className="atualizar" disabled={!mesas || ocupado || bloqueado} onClick={limpar}>Já conferi a lista: iniciar outra operação</button>}
        </section>}
    </div>;
}
