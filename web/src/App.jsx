import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import RecuperarSenha from "./pages/RecuperarSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import Dashboard from "./pages/Dashboard";
import Produtos from "./pages/Produtos";
import Estoque from "./pages/Estoque";
import Vendas from "./pages/Vendas";
import Reservas from "./pages/Reservas";
import Despesas from "./pages/Despesas";
import Relatorios from "./pages/Relatorios";

function RotaProtegida() {
    const { usuario } = useAuth();
    return usuario ? <Outlet /> : <Navigate to="/login" replace />;
}
export default function App() {
    const { pathname } = useLocation();
    useEffect(() => {
        const titulos = { "/login": "Entrar", "/recuperar-senha": "Recuperar senha", "/redefinir-senha": "Criar nova senha", "/produtos": "Produtos", "/estoque": "Estoque", "/vendas": "Vendas", "/reservas": "Reservas de mesas", "/despesas": "Despesas", "/relatorios": "Relatórios financeiros", "/dashboard": "Dashboard", "/inicio": "Dashboard" };
        document.title = `${titulos[pathname] || "Acesso"} | Maestro`;
    }, [pathname]);
    return <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route element={<RotaProtegida />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/reservas" element={<Reservas />} />
            <Route path="/despesas" element={<Despesas />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/inicio" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>;
}
