import { useCallback, useEffect, useRef, useState } from "react";
import CabecalhoPainel from "../components/CabecalhoPainel";
import { useAuth } from "../contexts/AuthContext";
import { dinheiro, numero, horario, dataNoite } from "../utils/formatacao";
import "../dashboard.css";

const tipos = { bebida_alcoolica: "Bebida alcoólica", bebida_nao_alcoolica: "Bebida não alcoólica", guloseima: "Guloseima" };

export default function Dashboard() {
    const { consultar } = useAuth();
    const [dados, setDados] = useState(null);
    const [erro, setErro] = useState("");
    const [carregando, setCarregando] = useState(true);
    const requisicaoAtual = useRef(null);
    const carregar = useCallback(async () => {
        if (requisicaoAtual.current) return;
        const controle = new AbortController();
        requisicaoAtual.current = controle;
        setCarregando(true);
        try {
            const resposta = await consultar("/dashboard", { signal: controle.signal });
            if (!controle.signal.aborted) { setDados(resposta); setErro(""); }
        } catch (erro) {
            if (!controle.signal.aborted) setErro(erro.message);
        } finally {
            if (requisicaoAtual.current === controle) {
                requisicaoAtual.current = null;
                setCarregando(false);
            }
        }
    }, [consultar]);
    useEffect(() => {
        carregar();
        const atualizarVisivel = () => { if (document.visibilityState === "visible") carregar(); };
        const timer = setInterval(atualizarVisivel, 60000);
        document.addEventListener("visibilitychange", atualizarVisivel);
        window.addEventListener("focus", atualizarVisivel);
        return () => {
            requisicaoAtual.current?.abort();
            requisicaoAtual.current = null;
            clearInterval(timer);
            document.removeEventListener("visibilitychange", atualizarVisivel);
            window.removeEventListener("focus", atualizarVisivel);
        };
    }, [carregar]);
    const fuso = dados?.fuso_horario || "America/Sao_Paulo";
    return <div className="dashboard-layout">
        <CabecalhoPainel />
        <main className="painel-conteudo">
            <div className="painel-titulo"><div><p className="sobretitulo">VISÃO GERAL DO BAR</p><h1>Dashboard</h1><p>{dados ? `Noite de ${dataNoite(dados.vendas.data_noite)} · ${horario(dados.vendas.inicio, fuso)} às ${horario(dados.vendas.fim, fuso)} do dia seguinte` : "Vendas, reservas e estoque em um só lugar."}</p></div><button className="atualizar" onClick={carregar} disabled={carregando}>{carregando ? "Atualizando…" : "↻ Atualizar"}</button></div>
            {erro && <div className="mensagem erro" role="alert"><strong>Não foi possível atualizar o dashboard.</strong><p>{erro}</p>{dados && <p>Os números abaixo são da última consulta, às {horario(dados.atualizado_em, fuso)}. Use Atualizar para tentar novamente.</p>}</div>}
            {!dados && carregando && <div className="painel-carregando" role="status">Carregando os indicadores do bar…</div>}
            {dados && <>
                <div className="painel-referencia"><span className={dados.vendas.noite_em_andamento ? "etiqueta em-andamento" : "etiqueta"}>{dados.vendas.noite_em_andamento ? "Noite em andamento" : "Última noite encerrada"}</span><span>Mesas e estoque: situação atual</span></div>
                <section className="indicadores" aria-label="Indicadores do dashboard">
                    <article className="indicador indicador-meta"><h2>Meta de vendas da noite</h2><div className="valor-indicador">{dados.meta.disponivel ? `${numero(dados.meta.progresso_percentual)}%` : "Sem meta"}</div><p>{dados.meta.disponivel ? (dados.meta.atingida ? "Meta atingida!" : "da meta da noite anterior") : "A noite anterior não teve vendas."}</p>
                        {dados.meta.disponivel && <progress aria-label="Progresso da meta de vendas" max="100" value={Math.min(100, Number(dados.meta.progresso_percentual))} />}
                        <div className="valores-meta"><span>Vendas <strong>{dinheiro(dados.vendas.total)}</strong></span><span>Meta <strong>{dados.meta.disponivel ? dinheiro(dados.meta.valor) : "—"}</strong></span></div>
                    </article>
                    <article className="indicador"><h2>Mesas reservadas agora</h2><div className="valor-indicador">{numero(dados.mesas.reservadas_agora)}<span> / {numero(dados.mesas.total)}</span></div><p>{dados.mesas.total ? "mesas com reserva vigente" : "Nenhuma mesa cadastrada"}</p><div className="mesas-detalhes"><span><i className="livre" />{numero(dados.mesas.livres_agora)} livres agora</span><span>{numero(dados.mesas.ocupadas)} ocupadas · {numero(dados.mesas.manutencao)} em manutenção</span></div></article>
                    <article className="indicador"><h2>Cervejas disponíveis</h2><div className="valor-indicador">{dados.estoque.lista_cervejas_configurada ? numero(dados.estoque.cervejas_disponiveis) : "—"}</div><p>{dados.estoque.lista_cervejas_configurada ? "unidades no estoque" : "Lista de cervejas não configurada"}</p><div className="indicador-nota">Saldo atual das marcas cadastradas</div></article>
                </section>
                <div className="painel-blocos">
                    <section className="bloco vendas-bloco" aria-labelledby="titulo-vendas"><div className="bloco-titulo"><div><h2 id="titulo-vendas">Últimas vendas</h2><p>Últimos 5 itens vendidos na noite</p></div><span className="contador">{numero(dados.vendas.quantidade)} vendas na noite</span></div>
                        {dados.ultimas_vendas.length ? <div className="tabela-container" tabIndex="0" role="region" aria-label="Últimos itens vendidos"><table><thead><tr><th scope="col">Hora</th><th scope="col">Produto</th><th scope="col" className="numerico">Qtd.</th><th scope="col" className="numerico">Subtotal</th><th scope="col">Responsável</th></tr></thead><tbody>{dados.ultimas_vendas.map(item => <tr key={`${item.id_venda}-${item.id_produto}`}><td>{horario(item.data_hora_venda, fuso)}</td><td><strong>{item.nome_produto}</strong><small>Venda #{item.id_venda}</small></td><td className="numerico">{numero(item.quantidade)}</td><td className="numerico valor-tabela">{dinheiro(item.subtotal)}</td><td>{item.nome_responsavel}</td></tr>)}</tbody></table></div> : <div className="estado-vazio"><span aria-hidden="true">↗</span><h3>Nenhuma venda nesta noite</h3><p>Os itens vendidos aparecerão aqui após o registro de uma venda.</p></div>}
                    </section>
                    <section className="bloco estoque-bloco" aria-labelledby="titulo-estoque"><div className="bloco-titulo"><div><h2 id="titulo-estoque">Estoque baixo</h2><p>Produtos com até {dados.estoque.limite_baixo} unidades</p></div><span className="sinal-alerta" aria-hidden="true">!</span></div>
                        {dados.estoque.produtos_baixos.length ? <ul className="lista-estoque">{dados.estoque.produtos_baixos.map(produto => <li key={produto.id_produto}><div><strong>{produto.nome_produto}</strong><span>{tipos[produto.tipo_produto] || produto.tipo_produto}</span></div><span className={produto.quantidade_produto === 0 ? "saldo esgotado" : "saldo"}>{produto.quantidade_produto === 0 ? "Esgotado" : `${numero(produto.quantidade_produto)} un.`}</span></li>)}</ul> : <div className="estado-vazio"><span aria-hidden="true">✓</span><h3>Nenhum alerta de estoque</h3><p>Não há produtos cadastrados dentro do limite de alerta.</p></div>}
                    </section>
                </div>
                <p className="painel-atualizacao" role="status">{carregando ? "Atualizando indicadores…" : `Atualizado em ${horario(dados.atualizado_em, fuso)} · Horário de São Paulo · Atualização a cada minuto`}</p>
            </>}
        </main>
    </div>;
}
