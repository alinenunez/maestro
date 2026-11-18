import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { dinheiro, numero } from "../utils/formatacao";
import { centavos, reais } from "../utils/calculoVenda";

function dataHora(valor) {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(valor));
}

export default function HistoricoVendas({ revisao }) {
    const { consultar } = useAuth();
    const [vendas, setVendas] = useState(null);
    const [erro, setErro] = useState("");
    const [atualizacao, setAtualizacao] = useState(0);
    const [idDetalhe, setIdDetalhe] = useState(null);
    const [detalhe, setDetalhe] = useState(null);
    const [erroDetalhe, setErroDetalhe] = useState("");
    const [tentativaDetalhe, setTentativaDetalhe] = useState(0);
    const dialogo = useRef(null);

    useEffect(() => {
        const controle = new AbortController();
        setVendas(null); setErro("");
        consultar("/vendas", { signal: controle.signal })
            .then(lista => { if (!controle.signal.aborted) setVendas(lista); })
            .catch(erro => { if (!controle.signal.aborted) setErro(erro.message); });
        return () => controle.abort();
    }, [consultar, revisao, atualizacao]);

    useEffect(() => {
        if (idDetalhe === null) return;
        const controle = new AbortController();
        setDetalhe(null); setErroDetalhe("");
        consultar(`/vendas/${idDetalhe}`, { signal: controle.signal })
            .then(venda => { if (!controle.signal.aborted) setDetalhe(venda); })
            .catch(erro => { if (!controle.signal.aborted) setErroDetalhe(erro.message); });
        return () => controle.abort();
    }, [consultar, idDetalhe, tentativaDetalhe]);

    function abrir(id) {
        setDetalhe(null); setErroDetalhe(""); setIdDetalhe(id);
        dialogo.current.showModal();
    }

    return <section id="historico-vendas" className="bloco historico-vendas" aria-labelledby="titulo-historico-vendas">
        <div className="bloco-titulo"><div><h2 id="titulo-historico-vendas">Histórico de vendas</h2><p>Vendas mais recentes primeiro · Horário de São Paulo.</p></div>
            <button className="atualizar" onClick={() => setAtualizacao(n => n + 1)}>Atualizar histórico</button>
        </div>
        {erro ? <div className="estado-vazio" role="alert"><p>{erro}</p><button className="atualizar" onClick={() => setAtualizacao(n => n + 1)}>Tentar novamente</button></div>
            : !vendas ? <p className="estado-vazio" role="status">Carregando vendas…</p>
                : !vendas.length ? <div className="estado-vazio"><h3>Nenhuma venda registrada</h3><p>As vendas concluídas aparecerão aqui.</p></div>
                    : <div className="tabela-container" role="region" aria-label="Vendas registradas" tabIndex="0"><table>
                        <thead><tr><th scope="col">Venda</th><th scope="col">Data e hora</th><th scope="col">Responsável</th><th scope="col" className="numerico">Total</th><th scope="col">Detalhes</th></tr></thead>
                        <tbody>{vendas.map(venda => <tr key={venda.id_venda}>
                            <td>#{venda.id_venda}</td><td className="venda-data">{dataHora(venda.data_hora_venda)}</td>
                            <td><strong>{venda.usuario.nome_completo}</strong></td><td className="numerico">{dinheiro(venda.valor_total)}</td>
                            <td><button className="ver-venda" onClick={() => abrir(venda.id_venda)} aria-label={`Ver itens da venda ${venda.id_venda}`}>Ver itens</button></td>
                        </tr>)}</tbody>
                    </table></div>}
        <dialog ref={dialogo} className="detalhe-venda" aria-labelledby="titulo-detalhe-venda" onClose={() => setIdDetalhe(null)}>
            <div className="bloco-titulo"><h2 id="titulo-detalhe-venda">Venda #{idDetalhe}</h2><button autoFocus className="atualizar" onClick={() => dialogo.current.close()}>Fechar</button></div>
            {erroDetalhe ? <div className="estado-vazio" role="alert"><p>{erroDetalhe}</p><button className="atualizar" onClick={() => setTentativaDetalhe(n => n + 1)}>Recarregar detalhes</button></div>
                : !detalhe ? <p className="estado-vazio" role="status">Carregando detalhes…</p>
                    : <>
                        <div className="venda-dados"><p>{dataHora(detalhe.data_hora_venda)} · São Paulo</p><p>Responsável: <strong>{detalhe.usuario.nome_completo}</strong></p><p>Confirmação de maioridade registrada: {detalhe.confirmacao_maior_idade ? "Sim" : "Não"}.</p></div>
                        <div className="tabela-container" role="region" aria-label="Itens da venda" tabIndex="0"><table>
                            <thead><tr><th scope="col">Produto</th><th scope="col" className="numerico">Qtd.</th><th scope="col" className="numerico">Preço unitário</th><th scope="col" className="numerico">Subtotal</th></tr></thead>
                            <tbody>{detalhe.itens.map(item => <tr key={item.id_produto}><td><strong>{item.produto.nome_produto}</strong></td><td className="numerico">{numero(item.quantidade)}</td><td className="numerico">{dinheiro(item.valor_unitario)}</td><td className="numerico">{dinheiro(reais(centavos(item.valor_unitario) * BigInt(item.quantidade)))}</td></tr>)}</tbody>
                        </table></div>
                        <p className="venda-total-detalhe">Total registrado <strong>{dinheiro(detalhe.valor_total)}</strong></p>
                        <p className="venda-nota">Valores praticados nesta venda, preservados mesmo após alterações no preço dos produtos.</p>
                    </>}
        </dialog>
    </section>;
}
