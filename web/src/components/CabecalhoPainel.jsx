import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Marca } from "./AuthLayout";
import { useAuth } from "../contexts/AuthContext";
const opcoes = [
    { nome: "Funcionários", administrador: true }, { nome: "Produtos", caminho: "/produtos" },
    { nome: "Estoque", caminho: "/estoque" }, { nome: "Vendas" }, { nome: "Despesas", administrador: true },
    { nome: "Relatórios", administrador: true }, { nome: "Reservas de mesas" },
];
function NavOpcao({ opcao, fechar }) {
    return opcao.caminho ? <NavLink to={opcao.caminho} onClick={fechar}>{opcao.nome}</NavLink> : <button disabled title="Tela disponível em uma próxima etapa">{opcao.nome}</button>;
}
export default function CabecalhoPainel() {
    const { usuario, sair } = useAuth();
    const [menuAberto, setMenuAberto] = useState(false);
    return <header className="painel-header">
            <Marca />
            <button className="menu-alternar" aria-expanded={menuAberto} aria-controls="menu-painel" onClick={() => setMenuAberto(!menuAberto)}>Menu <span aria-hidden="true">☰</span></button>
            <nav id="menu-painel" aria-label="Menu principal" className={menuAberto ? "menu-painel aberto" : "menu-painel"}>
                <NavLink to="/dashboard" onClick={() => setMenuAberto(false)}>Dashboard</NavLink>
                {opcoes.filter(opcao => !opcao.administrador || usuario.tipo_acesso === "administrador").map(opcao => <NavOpcao key={opcao.nome} opcao={opcao} fechar={() => setMenuAberto(false)} />)}
            </nav>
            <div className="painel-usuario"><span>{usuario.nome_completo}<small>{usuario.tipo_acesso === "administrador" ? "Administrador" : "Funcionário"}</small></span><button onClick={() => sair()} aria-label="Sair do sistema">Sair <span aria-hidden="true">↗</span></button></div>
        </header>;
}
