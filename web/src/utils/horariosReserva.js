const fuso = "America/Sao_Paulo";
const formato = new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });

// Campos de data/hora sempre representam o horario do bar, independentemente do computador.
export function paraCampo(valor) {
    const data = new Date(valor);
    const partes = formato.formatToParts(data);
    const parte = tipo => partes.find(p => p.type === tipo).value;
    const base = `${parte("year").padStart(4, "0")}-${parte("month")}-${parte("day")}T${parte("hour")}:${parte("minute")}`;
    const segundos = parte("second"), milis = data.getUTCMilliseconds();
    return base + (segundos !== "00" || milis ? `:${segundos}${milis ? `.${String(milis).padStart(3, "0")}` : ""}` : "");
}

export function paraIso(valor) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(valor) || valor.startsWith("0000")) throw new Error("Informe uma data e horário válidos.");
    const desejado = new Date(`${valor}Z`);
    if (!Number.isFinite(desejado.getTime())) throw new Error("Informe uma data e horário válidos.");
    const normalizado = desejado.toISOString().slice(0, 23);
    const entrada = valor.length === 16 ? `${valor}:00.000` : valor.length === 19 ? `${valor}.000` : valor.padEnd(23, "0");
    if (normalizado !== entrada) throw new Error("Informe uma data e horário válidos.");
    let instante = desejado.getTime();
    for (let i = 0; i < 4; i++) {
        const local = new Date(`${paraCampo(instante)}Z`).getTime();
        const diferenca = desejado.getTime() - local;
        if (!diferenca) return new Date(instante).toISOString();
        instante += diferenca;
    }
    throw new Error("Esse horário não existe no fuso de São Paulo. Escolha outro horário.");
}

export function periodoReserva(inicio, duracao) {
    if (!/^\d+$/.test(String(duracao)) || Number(duracao) < 1 || Number(duracao) > 2147483647) throw new Error("Informe uma duração inteira maior que zero, em minutos.");
    const iso = paraIso(inicio);
    const fim = new Date(new Date(iso).getTime() + Number(duracao) * 60000);
    if (!Number.isFinite(fim.getTime()) || fim.getUTCFullYear() > 9999) throw new Error("O término ultrapassa o limite de data permitido.");
    return { inicio: iso, fim: fim.toISOString() };
}

export function periodoDia(dia) {
    const inicio = paraIso(`${dia}T00:00`);
    const seguinte = new Date(`${dia}T12:00:00Z`);
    seguinte.setUTCDate(seguinte.getUTCDate() + 1);
    return { inicio, fim: paraIso(`${seguinte.toISOString().slice(0, 10)}T00:00`) };
}

export function exibirHorario(valor) {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, dateStyle: "short", timeStyle: "short" }).format(new Date(valor));
}
