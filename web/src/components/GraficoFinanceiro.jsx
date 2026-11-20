import { useMemo } from "react";
import { agruparMovimentos, valorReais } from "../utils/relatorioExportacao";
import { dataNoite, dinheiro } from "../utils/formatacao";

export default function GraficoFinanceiro({ relatorio }) {
    const { diasPorFaixa, faixas } = useMemo(() => agruparMovimentos(relatorio), [relatorio]);
    const maior = faixas.reduce((max, f) => [max, f.receitas, f.custos].reduce((a, b) => a > b ? a : b), 0n);
    // Converte somente a proporção visual; valores monetários continuam inteiros.
    const largura = valor => maior ? `${Number(valor * 10000n / maior) / 100}%` : "0%";
    return <section className="bloco grafico-financeiro" aria-labelledby="titulo-grafico">
        <div className="bloco-titulo"><div><h2 id="titulo-grafico">Entradas e saídas</h2><p>Faixas de {diasPorFaixa} dias a partir do início consultado; a última pode ser menor.</p></div></div>
        <p className="grafico-legenda">Entradas: vendas. Saídas: compras de estoque + despesas.</p>
        <ul>{faixas.map(f => <li key={f.inicio}>
            <h3>{dataNoite(f.inicio)} a {dataNoite(f.fim)}</h3>
            <div className="grafico-linha"><span>Entradas</span><div className="grafico-trilho" aria-hidden="true"><div className="barra-entrada" style={{ width: largura(f.receitas) }} /></div><strong>{dinheiro(valorReais(f.receitas))}</strong></div>
            <div className="grafico-linha"><span>Saídas</span><div className="grafico-trilho" aria-hidden="true"><div className="barra-saida" style={{ width: largura(f.custos) }} /></div><strong>{dinheiro(valorReais(f.custos))}</strong></div>
        </li>)}</ul>
    </section>;
}
