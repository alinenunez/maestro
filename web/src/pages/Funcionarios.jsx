import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import CabecalhoPainel from "../components/CabecalhoPainel";
import CampoSenha from "../components/CampoSenha";
import { useAuth } from "../contexts/AuthContext";
import { paraCampo } from "../utils/horariosReserva";
import "../dashboard.css";
import "../funcionarios.css";

const novo = () => ({ nome_completo: "", cpf: "", email: "", data_nascimento: "", data_inicio: paraCampo(new Date()).slice(0, 10), tipo_contratacao: "efetivo", situacao: true, senha: "", confirmacao_senha: "" });
const campos = [
    { nome: "nome_completo", titulo: "Nome completo", limite: 150 },
    { nome: "cpf", titulo: "CPF", limite: 14 },
    { nome: "email", titulo: "E-mail", tipo: "email", limite: 254 },
    { nome: "data_nascimento", titulo: "Data de nascimento", tipo: "date" },
    { nome: "data_inicio", titulo: "Data de início", tipo: "date" },
];
const cpfOculto = cpf => `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;

export default function Funcionarios() {
    const { usuario } = useAuth();
    return usuario?.tipo_acesso === "administrador" ? <ConteudoFuncionarios /> : <Navigate to="/dashboard" replace />;
}

function ConteudoFuncionarios() {
    const { consultar } = useAuth();
    const [lista, setLista] = useState(null);
    const [erroLista, setErroLista] = useState("");
    const [revisao, setRevisao] = useState(0);
    const [busca, setBusca] = useState("");
    const [situacao, setSituacao] = useState("");
    const [form, setForm] = useState(null);
    const [original, setOriginal] = useState(null);
    const [ocupado, setOcupado] = useState(false);
    const [incerto, setIncerto] = useState(false);
    const [erro, setErro] = useState("");
    const [mensagem, setMensagem] = useState("");
    const [trocarSenha, setTrocarSenha] = useState(false);
    const trava = useRef(false);
    const nomeInput = useRef(null);
    useEffect(() => {
        const controle = new AbortController();
        setLista(null); setErroLista("");
        consultar("/usuarios", { signal: controle.signal })
            .then(dados => { if (!controle.signal.aborted) setLista(dados.filter(u => u.tipo_acesso === "funcionario")); })
            .catch(falha => { if (!controle.signal.aborted) setErroLista(falha.message); });
        return () => controle.abort();
    }, [consultar, revisao]);
    useEffect(() => { if (form) nomeInput.current?.focus(); }, [original, Boolean(form)]);
    const visiveis = (lista || []).filter(u => (!situacao || String(u.situacao) === situacao) && u.nome_completo.toLocaleLowerCase("pt-BR").includes(busca.trim().toLocaleLowerCase("pt-BR")));
    const atualizar = () => setRevisao(v => v + 1);
    const mudar = (campo, valor) => setForm(atual => ({ ...atual, [campo]: valor }));
    function fechar() { setForm(null); setOriginal(null); setTrocarSenha(false); setErro(""); setIncerto(false); }
    async function editar(id) {
        if (trava.current) return;
        trava.current = true; setOcupado(true); setErro(""); setMensagem("");
        try {
            const atual = await consultar(`/usuarios/${id}`);
            if (atual.tipo_acesso !== "funcionario") throw new Error("Este cadastro não pertence a um funcionário.");
            setOriginal(atual); setForm({ ...atual, senha: "", confirmacao_senha: "" }); setTrocarSenha(false); setIncerto(false);
        } catch (falha) { setErro(falha.message); }
        finally { trava.current = false; setOcupado(false); }
    }
    async function salvar(evento) {
        evento.preventDefault();
        if (trava.current || incerto) return;
        setErro(""); setMensagem("");
        const dados = { nome_completo: form.nome_completo.trim(), cpf: form.cpf.trim(), email: form.email.trim().toLowerCase(), data_nascimento: form.data_nascimento, data_inicio: form.data_inicio, tipo_contratacao: form.tipo_contratacao, situacao: form.situacao };
        if (!dados.nome_completo) { setErro("Informe o nome completo."); return; }
        if (!/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(dados.cpf)) { setErro("Informe um CPF com 11 dígitos, com ou sem pontuação."); return; }
        dados.cpf = dados.cpf.replace(/\D/g, "");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) { setErro("Informe um e-mail válido."); return; }
        for (const campo of ["data_inicio", "data_nascimento"]) {
            const data = new Date(`${dados[campo]}T00:00:00Z`);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dados[campo]) || dados[campo].startsWith("0000") || !Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== dados[campo]) { setErro("Informe datas válidas de nascimento e início."); return; }
        }
        if (original) {
            for (const campo of Object.keys(dados)) if (dados[campo] === original[campo]) delete dados[campo];
        } else dados.tipo_acesso = "funcionario";
        if (!original || trocarSenha) {
            if (!form.senha.trim() || new TextEncoder().encode(form.senha).length > 72) { setErro("Informe uma senha de até 72 bytes. Caracteres acentuados podem ocupar mais de um byte."); return; }
            if (form.senha !== form.confirmacao_senha) { setErro("A confirmação deve ser igual à senha."); return; }
            dados.senha = form.senha; dados.confirmacao_senha = form.confirmacao_senha;
        }
        if (!Object.keys(dados).length) { setMensagem("Nenhuma alteração para salvar."); return; }
        if (original?.situacao && dados.situacao === false && !window.confirm(`Inativar ${original.nome_completo}? O funcionário perderá o acesso ao sistema. Seu histórico será mantido.`)) return;
        trava.current = true; setOcupado(true);
        try {
            await consultar(original ? `/usuarios/${original.id_usuario}` : "/usuarios", { metodo: original ? "PATCH" : "POST", dados });
            setMensagem(original ? "Funcionário atualizado com sucesso." : "Funcionário cadastrado com sucesso.");
            fechar(); atualizar();
        } catch (falha) {
            if (!falha.status || falha.status >= 500) {
                setIncerto(true); atualizar();
                setErro("Não foi possível confirmar o envio. Confira o cadastro na lista antes de tentar novamente. Se houve troca de senha, use a recuperação por e-mail caso necessário.");
                setForm(atual => ({ ...atual, senha: "", confirmacao_senha: "" }));
            } else setErro(falha.message);
        } finally { trava.current = false; setOcupado(false); }
    }

    return <div className="dashboard-layout"><CabecalhoPainel /><main className="painel-conteudo">
        <div className="painel-titulo"><div><p className="sobretitulo">EQUIPE DO BAR</p><h1>Funcionários</h1><p>Cadastro e situação de acesso da equipe.</p></div><button className="atualizar" disabled={ocupado || Boolean(form)} onClick={() => { setOriginal(null); setForm(novo()); setErro(""); setMensagem(""); }}>Novo funcionário</button></div>
        {mensagem && <p className="mensagem sucesso" role="status">{mensagem}</p>}
        {erro && !form && <p className="mensagem erro" role="alert">{erro}</p>}
        <div className="funcionarios-filtros"><div className="campo"><label htmlFor="busca-funcionario">Buscar por nome</label><input id="busca-funcionario" type="search" value={busca} onChange={e => setBusca(e.target.value)} /></div><div className="campo"><label htmlFor="situacao-filtro">Situação</label><select id="situacao-filtro" value={situacao} onChange={e => setSituacao(e.target.value)}><option value="">Todas</option><option value="true">Ativos</option><option value="false">Inativos</option></select></div><button className="atualizar" onClick={atualizar} disabled={ocupado}>Atualizar lista</button></div>
        <section className="bloco" aria-label="Lista de funcionários">
            <div className="bloco-titulo"><h2>Funcionários cadastrados</h2>{lista && <span className="contador">{visiveis.length} funcionário(s)</span>}</div>
            {erroLista ? <div className="estado-vazio" role="alert"><p>{erroLista}</p><button className="atualizar" onClick={atualizar} disabled={ocupado}>Tentar novamente</button></div> : !lista ? <p className="estado-vazio" role="status">Carregando funcionários…</p> : !visiveis.length ? <p className="estado-vazio">{lista.length ? "Nenhum funcionário corresponde aos filtros." : "Nenhum funcionário cadastrado."}</p> : <div className="tabela-container funcionarios-tabela" tabIndex="0" role="region" aria-label="Funcionários"><table><thead><tr><th>Nome</th><th>CPF</th><th>E-mail</th><th>Contratação</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{visiveis.map(u => <tr key={u.id_usuario}><td>{u.nome_completo}</td><td className="funcionario-cpf">{cpfOculto(u.cpf)}</td><td>{u.email}</td><td>{u.tipo_contratacao === "efetivo" ? "Efetivo" : "Temporário"}</td><td>{u.situacao ? "Ativo" : "Inativo"}</td><td><button className="atualizar" disabled={ocupado || Boolean(form)} onClick={() => editar(u.id_usuario)} aria-label={`Ver e editar ${u.nome_completo}`}>Ver / editar</button></td></tr>)}</tbody></table></div>}
        </section>
        {form && <section className="funcionario-editor" aria-labelledby="titulo-funcionario"><h2 id="titulo-funcionario">{original ? "Editar funcionário" : "Novo funcionário"}</h2>
            {erro && <p className="mensagem erro" role="alert">{erro}</p>}
            <form onSubmit={salvar}><fieldset disabled={ocupado || incerto}><div className="funcionario-campos">
                {campos.map(c => <div className="campo" key={c.nome}><label htmlFor={`func-${c.nome}`}>{c.titulo}</label><input ref={c.nome === "nome_completo" ? nomeInput : undefined} id={`func-${c.nome}`} type={c.tipo || "text"} maxLength={c.limite} min={c.tipo === "date" ? "0001-01-01" : undefined} max={c.tipo === "date" ? "9999-12-31" : undefined} required value={form[c.nome]} onChange={e => mudar(c.nome, e.target.value)} /></div>)}
                <div className="campo"><label htmlFor="func-contratacao">Tipo de contratação</label><select id="func-contratacao" value={form.tipo_contratacao} onChange={e => mudar("tipo_contratacao", e.target.value)}><option value="efetivo">Efetivo</option><option value="temporario">Temporário</option></select></div>
                <div className="campo"><label htmlFor="func-situacao">Situação</label><select id="func-situacao" value={String(form.situacao)} onChange={e => mudar("situacao", e.target.value === "true")}><option value="true">Ativo</option><option value="false">Inativo</option></select></div>
            </div>
            {original && <label className="funcionario-trocar"><input type="checkbox" checked={trocarSenha} onChange={e => { setTrocarSenha(e.target.checked); setForm(atual => ({ ...atual, senha: "", confirmacao_senha: "" })); }} /> Alterar senha</label>}
            {(!original || trocarSenha) && <div className="funcionario-campos"><CampoSenha id="func-senha" label="Senha" autoComplete="new-password" value={form.senha} onChange={e => mudar("senha", e.target.value)} /><CampoSenha id="func-confirmacao" label="Confirmação de senha" autoComplete="new-password" value={form.confirmacao_senha} onChange={e => mudar("confirmacao_senha", e.target.value)} /></div>}
            <p className="funcionario-nota">Perfil de acesso: funcionário. Inativar bloqueia o acesso e preserva os registros anteriores.</p><button className="botao-primario">{ocupado ? "Salvando…" : "Salvar funcionário"}</button>
            </fieldset></form><button className="atualizar" disabled={ocupado} onClick={fechar}>{incerto ? "Fechar e conferir cadastro" : "Cancelar edição"}</button>
        </section>}
    </main></div>;
}
