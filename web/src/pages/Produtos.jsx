import { useEffect, useRef, useState } from "react";
import CabecalhoPainel from "../components/CabecalhoPainel";
import { useAuth } from "../contexts/AuthContext";
import { dinheiro, numero } from "../utils/formatacao";
import "../dashboard.css";
import "../produtos.css";

const tipos = { bebida_alcoolica: "Bebida alcoólica", bebida_nao_alcoolica: "Bebida não alcoólica", guloseima: "Guloseima", ficha_sinuca: "Ficha de sinuca" };
const vazio = { nome_produto: "", tipo_produto: "bebida_alcoolica", valor_unitario: "" };

export default function Produtos() {
    const { usuario, consultar } = useAuth();
    const administrador = usuario.tipo_acesso === "administrador";
    const [busca, setBusca] = useState("");
    const [filtros, setFiltros] = useState({ nome: "", tipo: "" });
    const [produtos, setProdutos] = useState(null);
    const [erroLista, setErroLista] = useState("");
    const [revisao, setRevisao] = useState(0);
    const [form, setForm] = useState(vazio);
    const [original, setOriginal] = useState(null);
    const [erro, setErro] = useState("");
    const [mensagem, setMensagem] = useState("");
    const [ocupado, setOcupado] = useState(false);
    const trava = useRef(false);
    const nomeInput = useRef(null);
    const dialogo = useRef(null);
    const [exclusao, setExclusao] = useState(null);
    const [erroExclusao, setErroExclusao] = useState("");
    useEffect(() => {
        const controle = new AbortController();
        setProdutos(null); setErroLista("");
        consultar(`/produtos?${new URLSearchParams(filtros)}`, { signal: controle.signal })
            .then(lista => { if (!controle.signal.aborted) setProdutos(lista); })
            .catch(erro => { if (!controle.signal.aborted) setErroLista(erro.message); });
        return () => controle.abort();
    }, [consultar, filtros, revisao]);
    useEffect(() => { if (original && !ocupado) nomeInput.current?.focus(); }, [original, ocupado]);
    function limpar() { setOriginal(null); setForm(vazio); setErro(""); }
    function mudar(campo, valor) { setForm(anterior => ({ ...anterior, [campo]: valor })); }
    function iniciar() { if (trava.current) return false; trava.current = true; setOcupado(true); return true; }
    function terminar() { trava.current = false; setOcupado(false); }
    async function editar(id) {
        if (!iniciar()) return;
        setErro(""); setMensagem("");
        try {
            const produto = await consultar(`/produtos/${id}`);
            setOriginal(produto);
            setForm({ ...produto, valor_unitario: produto.valor_unitario.replace(".", ",") });
        } catch (erro) { setErro(erro.message); }
        finally { terminar(); }
    }
    async function salvar(evento) {
        evento.preventDefault();
        if (!iniciar()) return;
        setErro(""); setMensagem("");
        try {
            const valor = form.valor_unitario.trim().replace(",", ".");
            if (!/^\d{1,10}(\.\d{1,2})?$/.test(valor)) throw new Error("Informe um preço válido, como 9,50, sem separador de milhar.");
            const ficha = form.tipo_produto === "ficha_sinuca";
            if (!form.nome_produto.trim()) throw new Error("Informe o nome do produto.");
            const dados = { nome_produto: form.nome_produto.trim(), tipo_produto: form.tipo_produto, valor_unitario: valor };
            if (original) {
                for (const campo of Object.keys(dados)) {
                    const igual = campo === "valor_unitario" ? Number(dados[campo]) === Number(original[campo]) : dados[campo] === original[campo];
                    if (igual) delete dados[campo];
                }
                if (!Object.keys(dados).length) { setMensagem("Nenhuma alteração para salvar."); return; }
            }
            await consultar(original ? `/produtos/${original.id_produto}` : "/produtos", { metodo: original ? "PATCH" : "POST", dados });
            setMensagem(original ? "Produto atualizado." : "Produto cadastrado.");
            limpar(); setRevisao(n => n + 1);
        } catch (erro) { setErro(erro.message); }
        finally { terminar(); }
    }
    function pedirExclusao(produto) {
        setExclusao(produto); setErroExclusao(""); dialogo.current.showModal();
    }
    async function excluir() {
        if (!iniciar()) return;
        setErroExclusao(""); setMensagem("");
        try {
            await consultar(`/produtos/${exclusao.id_produto}`, { metodo: "DELETE" });
            if (original?.id_produto === exclusao.id_produto) limpar();
            dialogo.current.close(); setExclusao(null); setMensagem("Produto excluído."); setRevisao(n => n + 1);
        } catch (erro) { setErroExclusao(erro.message); }
        finally { terminar(); }
    }
    return <div className="dashboard-layout"><CabecalhoPainel /><main className="painel-conteudo">
        <div className="painel-titulo"><div><p className="sobretitulo">CARDÁPIO E FICHAS DE SINUCA</p><h1>{administrador ? "Cadastro de produtos" : "Produtos"}</h1><p>Consulte os itens, custos de compra e saldos do bar.</p></div></div>
        {mensagem && <p className="mensagem sucesso" role="status">{mensagem}</p>}
        <div className={`produtos-layout ${administrador ? "" : "somente-consulta"}`}>
            <section aria-label="Lista de produtos">
                <form className="busca-produtos" onSubmit={e => { e.preventDefault(); setFiltros(atual => ({ ...atual, nome: busca.trim() })); }}><label className="campo-busca">Buscar por nome<input type="search" maxLength={150} value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome do produto" /></label><button className="atualizar">Buscar</button><button className="atualizar" type="button" onClick={() => { setBusca(""); setFiltros({ nome: "", tipo: "" }); }}>Limpar</button></form>
                <div className="filtros-tipo" role="group" aria-label="Filtrar por tipo">{Object.entries({ "": "Todos", ...tipos }).map(([valor, texto]) => <button key={valor} aria-pressed={filtros.tipo === valor} onClick={() => setFiltros(atual => ({ ...atual, tipo: valor }))}>{texto}</button>)}</div>
                <div className="bloco">
                    {erroLista ? <div className="estado-vazio" role="alert"><p>{erroLista}</p><button className="atualizar" onClick={() => setRevisao(n => n + 1)}>Tentar novamente</button></div> : !produtos ? <p className="estado-vazio" role="status">Carregando produtos…</p> : !produtos.length ? <div className="estado-vazio"><h2>Nenhum produto encontrado</h2><p>{filtros.nome || filtros.tipo ? "Ajuste os filtros para buscar outros produtos." : "Os produtos cadastrados aparecerão aqui."}</p></div> : <div className="tabela-container" role="region" aria-label="Produtos cadastrados" tabIndex="0"><table><thead><tr><th scope="col">Produto</th><th scope="col">Tipo</th><th scope="col">Estoque</th><th scope="col">Custo unitário</th>{administrador && <th scope="col">Ações</th>}</tr></thead><tbody>{produtos.map(produto => <tr key={produto.id_produto}><td><strong>{produto.nome_produto}</strong></td><td>{tipos[produto.tipo_produto] || produto.tipo_produto}</td><td>{produto.tipo_produto === "ficha_sinuca" ? "Não se aplica" : numero(produto.quantidade_produto)}</td><td className="numerico">{dinheiro(produto.valor_unitario)}</td>{administrador && <td><div className="acoes-produto"><button disabled={ocupado} onClick={() => editar(produto.id_produto)} aria-label={`Editar ${produto.nome_produto}`}>Editar</button><button disabled={ocupado} onClick={() => pedirExclusao(produto)} aria-label={`Excluir ${produto.nome_produto}`}>Excluir</button></div></td>}</tr>)}</tbody></table></div>}
                </div>
            </section>
            {administrador && <section className="produto-editor" aria-labelledby="titulo-editor"><h2 id="titulo-editor">{original ? "Editar produto" : "Novo produto"}</h2><form onSubmit={salvar} aria-busy={ocupado}><fieldset disabled={ocupado}>
                <div className="campo"><label htmlFor="tipo-produto">Tipo do produto</label><select id="tipo-produto" value={form.tipo_produto} onChange={e => mudar("tipo_produto", e.target.value)}>{!tipos[form.tipo_produto] && <option value={form.tipo_produto}>Selecione um tipo válido</option>}{Object.entries(tipos).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}</select></div>
                <div className="campo"><label htmlFor="nome-produto">Nome do produto</label><input ref={nomeInput} id="nome-produto" value={form.nome_produto} onChange={e => mudar("nome_produto",e.target.value)} maxLength={150} required placeholder="Ex.: Heineken 600ml" /></div>
                <div className="campo"><label htmlFor="preco-produto">Custo unitário de compra (R$)</label><input id="preco-produto" inputMode="decimal" value={form.valor_unitario} onChange={e => mudar("valor_unitario",e.target.value)} required placeholder="9,50" /></div>
                {form.tipo_produto === "ficha_sinuca"
                    ? <p className="aviso-ficha">Fichas não possuem controle de estoque e são definidas automaticamente com quantidade zero.{original && original.tipo_produto !== "ficha_sinuca" && " Ao salvar, o saldo atual será zerado."}</p>
                    : <p className="aviso-ficha">{original ? `Saldo atual: ${numero(original.quantidade_produto)} unidade(s). Para alterar o estoque, registre uma entrada na tela Estoque.` : "O produto será cadastrado com estoque zero. Para adicionar unidades, registre uma entrada na tela Estoque."}</p>}
                {erro && <p className="mensagem erro" role="alert">{erro}</p>}
                <button className="botao-primario">{ocupado ? "Aguarde…" : original ? "Salvar alterações" : "Salvar produto"}</button>
                {original && <button className="cancelar-edicao" type="button" onClick={limpar}>Cancelar edição</button>}
            </fieldset></form></section>}
        </div>
        {administrador && <dialog ref={dialogo} className="confirmar-exclusao" aria-labelledby="titulo-exclusao" onCancel={e => { if (ocupado) e.preventDefault(); }}><h2 id="titulo-exclusao">Excluir produto?</h2><p>{exclusao?.nome_produto}</p><p>Essa ação não pode ser desfeita. Produtos com vendas ou compras vinculadas não podem ser excluídos.</p>{erroExclusao && <p className="mensagem erro" role="alert">{erroExclusao}</p>}<div className="acoes-confirmacao"><button autoFocus disabled={ocupado} onClick={() => dialogo.current.close()}>Cancelar</button><button className="excluir-confirmado" disabled={ocupado} onClick={excluir}>{ocupado ? "Excluindo…" : "Confirmar exclusão"}</button></div></dialog>}
    </main></div>;
}
