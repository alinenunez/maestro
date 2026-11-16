import { useState } from "react";
export default function CampoSenha({ id = "senha", label = "Senha", autoComplete = "current-password", ...props }) {
    const [visivel, setVisivel] = useState(false);
    return <div className="campo">
        <label htmlFor={id}>{label}</label>
        <div className="campo-senha">
            <input id={id} name={id} type={visivel ? "text" : "password"} autoComplete={autoComplete} required {...props} />
            <button className="mostrar-senha" type="button" onClick={() => setVisivel(!visivel)} aria-label={visivel ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`} aria-pressed={visivel}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{visivel && <path d="m3 3 18 18" />}</svg>
            </button>
        </div>
    </div>;
}
