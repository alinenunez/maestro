import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import RecuperarSenha from "./pages/RecuperarSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import Inicio from "./pages/Inicio";

function RotaProtegida() {
    const { usuario } = useAuth();
    return usuario ? <Outlet /> : <Navigate to="/login" replace />;
}
export default function App() {
    const { pathname } = useLocation();
    useEffect(() => {
        const titulos = { "/login": "Entrar", "/recuperar-senha": "Recuperar senha", "/redefinir-senha": "Criar nova senha", "/inicio": "Início" };
        document.title = `${titulos[pathname] || "Acesso"} | Maestro`;
    }, [pathname]);
    return <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route element={<RotaProtegida />}><Route path="/inicio" element={<Inicio />} /></Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>;
}
