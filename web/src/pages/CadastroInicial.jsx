import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import CampoSenha from "../components/CampoSenha";
import { useAuth } from "../contexts/AuthContext";
import { requisicao } from "../services/api";
import { paraCampo } from "../utils/horariosReserva";
import "../cadastro-inicial.css";

const campos = [
    { nome: "nome_completo", label: "Nome completo", limite: 150, autoComplete: "name" },
    { nome: "cpf", label: "CPF", limite: 14, autoComplete: "off" },
    { nome: "email", label: "E-mail", limite: 254, tipo: "email", autoComplete: "email" },
    { nome: "data_nascimento", label: "Data de nascimento", tipo: "date", autoComplete: "bday" },
    { nome: "data_inicio", label: "Data de início", tipo: "date", autoComplete: "off" },
];
export default function CadastroInicial() {
    const { usuario } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState(() => ({ nome_completo: "", cpf: "", email: "", data_nascimento: "", data_inicio: paraCampo(new Date()).slice(0, 10), tipo_contratacao: "efetivo", senha: "", confirmacao_senha: "" }));
    const [chave, setChave] = useState("");
    const [erro, setErro] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [incerto, setIncerto] = useState(false);
    const trava = useRef(false);
    if (usuario) return <Navigate to="/dashboard" replace />;
    const mudar = (campo, valor) => setForm(atual => ({ ...atual, [campo]: valor }));
    async function cadastrar(evento) {
        evento.preventDefault();
        if (trava.current || incerto) return;
        setErro("");
        const dados = { ...form, nome_completo: form.nome_completo.trim(), cpf: form.cpf.trim(), email: form.email.trim().toLowerCase() };
        if (!dados.nome_completo) { setErro("Informe o nome completo."); return; }
        if (!/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(dados.cpf)) { setErro("Informe o CPF com 11 dígitos, com ou sem pontuação."); return; }
        dados.cpf = dados.cpf.replace(/\D/g, "");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) { setErro("Informe um e-mail válido."); return; }
        for (const campo of ["data_nascimento", "data_inicio"]) {
            const data = new Date(`${dados[campo]}T00:00:00Z`);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dados[campo]) || dados[campo].startsWith("0000") || !Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== dados[campo]) { setErro("Informe datas válidas de nascimento e início."); return; }
        }
        if (!form.senha.trim()) { setErro("Informe uma senha."); return; }
        if (form.senha !== form.confirmacao_senha) { setErro("A confirmação deve ser igual à senha."); return; }
        if (new TextEncoder().encode(form.senha).length > 72) { setErro("A senha ultrapassa o limite de 72 bytes. Use uma senha menor."); return; }
        if (!chave.trim()) { setErro("Informe a chave de cadastro inicial fornecida pelo responsável pela configuração."); return; }
        trava.current = true; setEnviando(true);
        try {
            // A API define o perfil de administrador e a situação ativa; não há seletor de perfil.
            await requisicao("/auth/cadastro-inicial", { metodo: "POST", dados, chaveCadastro: chave });
            setChave(""); setForm(atual => ({ ...atual, senha: "", confirmacao_senha: "" }));
            navigate("/login", { replace: true, state: { mensagem: "Administrador cadastrado com sucesso. Entre com seu e-mail e senha." } });
        } catch (falha) {
            if (!falha.status || falha.status >= 500) {
                setIncerto(true); setChave(""); setForm(atual => ({ ...atual, senha: "", confirmacao_senha: "" }));
                setErro("Não foi possível confirmar o cadastro. Ele pode ter sido concluído. Volte ao login e tente entrar antes de iniciar outro cadastro.");
            } else setErro(falha.message);
        } finally { trava.current = false; setEnviando(false); }
    }
    return <div className="cadastro-inicial"><AuthLayout>
        <span className="sobretitulo card-sobretitulo">PRIMEIRO ACESSO</span>
        <h1 id="titulo-formulario">Cadastrar administrador</h1>
        <p className="card-descricao">Crie a primeira conta para configurar e gerenciar o Maestro. Se o sistema já possui administrador, utilize o login.</p>
        <form onSubmit={cadastrar} aria-busy={enviando}><fieldset disabled={enviando || incerto}>
            <div className="cadastro-inicial-campos">
                {campos.map(c => <div className="campo" key={c.nome}><label htmlFor={`inicial-${c.nome}`}>{c.label}</label><input id={`inicial-${c.nome}`} name={c.nome} autoComplete={c.autoComplete} type={c.tipo || "text"} maxLength={c.limite} min={c.tipo === "date" ? "0001-01-01" : undefined} max={c.tipo === "date" ? "9999-12-31" : undefined} required value={form[c.nome]} onChange={e => mudar(c.nome, e.target.value)} /></div>)}
                <div className="campo"><label htmlFor="inicial-contratacao">Tipo de contratação</label><select id="inicial-contratacao" value={form.tipo_contratacao} onChange={e => mudar("tipo_contratacao", e.target.value)}><option value="efetivo">Efetivo</option><option value="temporario">Temporário</option></select></div>
                <CampoSenha id="inicial-senha" label="Senha" autoComplete="new-password" value={form.senha} onChange={e => mudar("senha", e.target.value)} />
                <CampoSenha id="inicial-confirmacao" label="Confirmação de senha" autoComplete="new-password" value={form.confirmacao_senha} onChange={e => mudar("confirmacao_senha", e.target.value)} />
            </div>
            <CampoSenha id="inicial-chave" label="Chave de cadastro inicial" autoComplete="off" value={chave} onChange={e => setChave(e.target.value)} aria-describedby="ajuda-chave-inicial" />
            <p id="ajuda-chave-inicial" className="cadastro-inicial-ajuda">Solicite a chave ao responsável pela configuração do sistema. Ela autoriza somente a criação do primeiro administrador.</p>
            <button className="botao-primario">{enviando ? "Cadastrando…" : "Cadastrar administrador"}</button>
        </fieldset></form>
        {erro && <p className="mensagem erro" role="alert">{erro}</p>}
        <Link className="voltar" to="/login">← Voltar ao login</Link>
    </AuthLayout></div>;
}
