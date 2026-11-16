import { useEffect, useState } from "react";
import { Marca } from "../components/AuthLayout";
import { useAuth } from "../contexts/AuthContext";

export default function Inicio() {
    const { consultar, sair } = useAuth();
    const [usuario, setUsuario] = useState(null);
    const [erro, setErro] = useState("");
    const [tentativa, setTentativa] = useState(0);
    useEffect(() => {
        const controle = new AbortController();
        async function conferir() {
            setErro("");
            try {
                const resposta = await consultar("/auth/me", { signal: controle.signal });
                if (!controle.signal.aborted) setUsuario(resposta.usuario);
            } catch (erro) { if (!controle.signal.aborted) setErro(erro.message); }
        }
        conferir();
        window.addEventListener("focus", conferir);
        return () => { controle.abort(); window.removeEventListener("focus", conferir); };
    }, [consultar, tentativa]);
    return <div className="inicio-layout">
        <header className="inicio-header"><Marca /><button className="botao-sair" onClick={() => sair()}>Sair <span aria-hidden="true">↗</span></button></header>
        <main className="inicio-conteudo">
            <span className="sobretitulo">SISTEMA MAESTRO</span>
            <h1>Bem-vindo{usuario ? `, ${usuario.nome_completo.split(" ")[0]}` : ""}.</h1>
            {erro ? <div role="alert"><p className="mensagem erro">{erro}</p><button className="botao-secundario" onClick={() => setTentativa(tentativa + 1)}>Tentar novamente</button></div> : usuario ? <section className="sessao-card"><span className="status-ponto" aria-hidden="true" /><div><h2>Acesso confirmado</h2><p>{usuario.nome_completo}</p><span>{usuario.tipo_acesso === "administrador" ? "Administrador" : "Funcionário"}</span></div></section> : <p role="status">Conferindo seu acesso…</p>}
        </main>
    </div>;
}
