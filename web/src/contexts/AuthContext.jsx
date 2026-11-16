import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { requisicao } from "../services/api";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    // Credenciais e token nao sao gravados no armazenamento do navegador.
    const [sessao, setSessao] = useState(null);
    const [aviso, setAviso] = useState("");
    const sair = useCallback((mensagem = "") => {
        setSessao(null);
        setAviso(mensagem);
    }, []);
    async function entrar(email, senha) {
        const dados = await requisicao("/auth/login", { metodo: "POST", dados: { email, senha } });
        setAviso("");
        setSessao({ ...dados, expiraEm: Date.now() + dados.expira_em * 1000 });
    }
    const consultar = useCallback(async (caminho, opcoes = {}) => {
        if (!sessao || sessao.expiraEm <= Date.now()) {
            sair("Sua sessão expirou. Entre novamente.");
            throw Object.assign(new Error("Sua sessão expirou. Entre novamente."), { status: 401 });
        }
        try { return await requisicao(caminho, { ...opcoes, token: sessao.token }); }
        catch (erro) {
            if (erro.status === 401) sair("Sua sessão terminou. Entre novamente.");
            throw erro;
        }
    }, [sessao, sair]);
    useEffect(() => {
        if (!sessao) return;
        const timer = setTimeout(() => sair("Sua sessão expirou. Entre novamente."), Math.max(0, sessao.expiraEm - Date.now()));
        return () => clearTimeout(timer);
    }, [sessao, sair]);
    return <AuthContext.Provider value={{ usuario: sessao?.usuario, aviso, entrar, sair, consultar }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
