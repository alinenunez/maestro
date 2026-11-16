import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { requisicao } from "../services/api";

export default function RecuperarSenha() {
    const [email, setEmail] = useState("");
    const [erro, setErro] = useState("");
    const [mensagem, setMensagem] = useState("");
    const [enviando, setEnviando] = useState(false);
    async function enviar(evento) {
        evento.preventDefault();
        if (enviando) return;
        setErro(""); setMensagem(""); setEnviando(true);
        try {
            const resultado = await requisicao("/auth/recuperar-senha", { metodo: "POST", dados: { email: email.trim() } });
            setMensagem(resultado.mensagem);
        } catch (erro) { setErro(erro.message); }
        finally { setEnviando(false); }
    }
    return <AuthLayout>
        <span className="sobretitulo card-sobretitulo">VAMOS AJUDAR VOCÊ</span>
        <h1 id="titulo-formulario">Recuperar senha</h1>
        <p className="card-descricao">Informe o e-mail cadastrado. Enviaremos um link para você criar uma nova senha.</p>
        <form onSubmit={enviar} aria-busy={enviando}>
            <div className="campo"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} required /></div>
            {erro && <p className="mensagem erro" role="alert">{erro}</p>}
            {mensagem && <p className="mensagem sucesso" role="status">{mensagem}</p>}
            <button className="botao-primario" disabled={enviando}>{enviando ? "Solicitando…" : "Enviar link de redefinição"}<span aria-hidden="true">→</span></button>
        </form>
        <Link className="voltar" to="/login">← Voltar ao login</Link>
    </AuthLayout>;
}
