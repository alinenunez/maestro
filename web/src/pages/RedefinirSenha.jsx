import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import CampoSenha from "../components/CampoSenha";
import { requisicao } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function RedefinirSenha() {
    const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
    const [senha, setSenha] = useState("");
    const [confirmacao, setConfirmacao] = useState("");
    const [erro, setErro] = useState("");
    const [enviando, setEnviando] = useState(false);
    const navigate = useNavigate();
    const { sair } = useAuth();
    useEffect(() => {
        // Retira o segredo do endereco e conserva apenas o estado em memoria da pagina.
        window.history.replaceState(window.history.state, "", window.location.pathname);
    }, []);
    async function enviar(evento) {
        evento.preventDefault();
        if (enviando) return;
        if (!senha.trim()) return setErro("Informe a nova senha.");
        if (senha !== confirmacao) return setErro("A confirmação deve ser igual à nova senha.");
        if (new TextEncoder().encode(senha).length > 72) return setErro("A senha ultrapassa o limite de 72 bytes. Use uma senha menor.");
        setErro(""); setEnviando(true);
        try {
            await requisicao("/auth/redefinir-senha", { metodo: "POST", dados: { token, senha, confirmacao_senha: confirmacao } });
            sair();
            navigate("/login", { replace: true, state: { mensagem: "Senha alterada com sucesso. Entre com sua nova senha." } });
        } catch (erro) { setErro(erro.message); }
        finally { setEnviando(false); }
    }
    return <AuthLayout>
        <span className="sobretitulo card-sobretitulo">UM NOVO COMEÇO</span>
        <h1 id="titulo-formulario">Criar nova senha</h1>
        <p className="card-descricao">Escolha uma nova senha para voltar a acessar o Maestro.</p>
        {!token ? <div className="mensagem informacao" role="status">Abra o link recebido por e-mail para redefinir sua senha.</div> : <form onSubmit={enviar} aria-busy={enviando}>
            <CampoSenha label="Nova senha" autoComplete="new-password" value={senha} onChange={e => setSenha(e.target.value)} />
            <CampoSenha id="confirmacao-senha" label="Confirme a nova senha" autoComplete="new-password" value={confirmacao} onChange={e => setConfirmacao(e.target.value)} />
            {erro && <p className="mensagem erro" role="alert">{erro}</p>}
            <button className="botao-primario" disabled={enviando}>{enviando ? "Salvando…" : "Salvar nova senha"}<span aria-hidden="true">→</span></button>
        </form>}
        <Link className="voltar" to="/recuperar-senha">Solicitar outro link</Link>
        <Link className="voltar voltar-secundario" to="/login">← Voltar ao login</Link>
    </AuthLayout>;
}
