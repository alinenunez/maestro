import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AuthLayout from "../components/AuthLayout";
import CampoSenha from "../components/CampoSenha";

export default function Login() {
    const { usuario, entrar, aviso } = useAuth();
    const location = useLocation();
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState("");
    const [enviando, setEnviando] = useState(false);
    if (usuario) return <Navigate to="/inicio" replace />;
    async function enviar(evento) {
        evento.preventDefault();
        if (enviando) return;
        setErro(""); setEnviando(true);
        try { await entrar(email.trim(), senha); }
        catch (erro) { setErro(erro.message); }
        finally { setEnviando(false); }
    }
    return <AuthLayout destaque>
        <span className="sobretitulo card-sobretitulo">BEM-VINDO DE VOLTA</span>
        <h2 id="titulo-formulario">Entrar</h2>
        <p className="card-descricao">Use seu e-mail e senha para acessar o sistema.</p>
        {(aviso || location.state?.mensagem) && <p className="mensagem informacao" role="status">{aviso || location.state.mensagem}</p>}
        <form onSubmit={enviar} aria-busy={enviando}>
            <div className="campo"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" autoComplete="username" placeholder="voce@exemplo.com" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <CampoSenha value={senha} onChange={e => setSenha(e.target.value)} placeholder="Digite sua senha" />
            <div className="recuperar-link"><Link to="/recuperar-senha">Esqueceu a senha?</Link></div>
            {erro && <p className="mensagem erro" role="alert">{erro}</p>}
            <button className="botao-primario" disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}<span aria-hidden="true">→</span></button>
        </form>
        <p className="card-rodape">Precisa de acesso? Fale com o administrador.</p>
    </AuthLayout>;
}
