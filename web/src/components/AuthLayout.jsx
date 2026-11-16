export function Marca() {
    return <div className="marca" aria-label="Sistema Maestro"><span className="marca-simbolo" aria-hidden="true">M<span>•</span></span><span>maestro<span className="marca-legenda">GESTÃO DO SEU BAR</span></span></div>;
}
export default function AuthLayout({ children, destaque = false }) {
    return <div className="auth-layout">
        <header className="auth-header"><Marca /><span className="header-legenda">Seu bar, em harmonia.</span></header>
        <main className={`auth-main ${destaque ? "com-destaque" : ""}`}>
            {destaque && <section className="apresentacao" aria-label="Sistema Maestro">
                <span className="marca-fundo" aria-hidden="true">M</span>
                <p className="sobretitulo">MAIS CONTROLE. MAIS TEMPO.</p>
                <h1>Gestão inteligente<br />para o seu bar<span className="ponto">.</span></h1>
                <p className="apresentacao-descricao">Tudo no lugar para você cuidar<br className="desktop" /> do que faz a noite acontecer.</p>
                <ul className="beneficios"><li><span aria-hidden="true">↗</span> Reserva das mesas de sinuca</li><li><span aria-hidden="true">▦</span> Estoque atualizado a cada venda</li></ul>
            </section>}
            <section className="auth-card" aria-labelledby="titulo-formulario">{children}</section>
        </main>
        <footer className="auth-footer">Sistema Maestro <span aria-hidden="true">·</span> Gestão de vendas, estoque e reservas</footer>
    </div>;
}
