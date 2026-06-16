/* ============================================================
   leitor.js — lógica do painel do leitor
   ============================================================ */

(function () {
  const usuario = exigirPerfil("leitor");
  if (!usuario) return;

  document.getElementById("nome-usuario").textContent = usuario.nome;
  document.getElementById("btn-sair").addEventListener("click", sair);

  const alertaGlobal = document.getElementById("alerta-global");

  function mostrarAlerta(mensagem, tipo) {
    alertaGlobal.textContent = mensagem;
    alertaGlobal.className = `alert alert-${tipo}`;
    alertaGlobal.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function esconderAlerta() {
    alertaGlobal.classList.add("hidden");
  }

  /* ---------------------------------------------------------
     Catálogo de livros
     --------------------------------------------------------- */

  const tabelaLivros = document.getElementById("tabela-livros");

  async function carregarLivros() {
    try {
      const livros = await apiFetch("/livros");
      renderizarLivros(livros);
      return livros;
    } catch (erro) {
      mostrarAlerta(erro.message, "error");
      tabelaLivros.innerHTML =
        '<tr class="empty-row"><td colspan="6">Não foi possível carregar o catálogo.</td></tr>';
    }
  }

  function renderizarLivros(livros) {
    if (!livros.length) {
      tabelaLivros.innerHTML =
        '<tr class="empty-row"><td colspan="6">Nenhum livro cadastrado no acervo ainda.</td></tr>';
      return;
    }

    tabelaLivros.innerHTML = livros
      .map((livro) => {
        const disponivel = livro.quantidade_disponivel > 0;
        return `
          <tr>
            <td class="mono">#${livro.id}</td>
            <td>${escapeHtml(livro.titulo)}</td>
            <td>${escapeHtml(livro.autor)}</td>
            <td class="mono">${livro.ano_publicacao ?? "—"}</td>
            <td class="mono">${livro.quantidade_disponivel}</td>
            <td>
              <button
                class="btn btn-sm btn-primary"
                data-acao="solicitar"
                data-id="${livro.id}"
                data-titulo="${escapeHtml(livro.titulo)}"
                ${!disponivel ? 'disabled title="Sem exemplares disponíveis"' : ''}
              >
                Solicitar
              </button>
            </td>
          </tr>`;
      })
      .join("");
  }

  tabelaLivros.addEventListener("click", async (evento) => {
    const botao = evento.target.closest("button[data-acao='solicitar']");
    if (!botao || botao.disabled) return;

    const livroId = botao.dataset.id;
    const tituloLivro = botao.dataset.titulo;

    if (!confirm(`Confirmar solicitação de empréstimo de "${tituloLivro}"?`)) return;

    esconderAlerta();
    botao.disabled = true;

    try {
      await apiFetch("/emprestimos", {
        method: "POST",
        body: JSON.stringify({ livro_id: Number(livroId) }),
      });

      mostrarAlerta(`Empréstimo de "${tituloLivro}" solicitado com sucesso!`, "success");
      await Promise.all([carregarLivros(), carregarEmprestimos()]);
    } catch (erro) {
      mostrarAlerta(erro.message, "error");
      botao.disabled = false;
    }
  });

  /* ---------------------------------------------------------
     Meus empréstimos
     --------------------------------------------------------- */

  const tabelaEmprestimos = document.getElementById("tabela-emprestimos");

  const ROTULOS_STATUS = {
    ativo: "Ativo",
    devolvido: "Devolvido",
    atrasado: "Atrasado",
  };

  function renderizarStatus(emprestimo) {
    const rotulo = ROTULOS_STATUS[emprestimo.status] || emprestimo.status;
    let html = `<span class="stamp stamp--${emprestimo.status}">${rotulo}</span>`;

    if (emprestimo.devolucao_solicitada && emprestimo.status !== "devolvido") {
      html += ` <span class="stamp stamp--pendente">Ag. confirmação</span>`;
    }

    return html;
  }

  function renderizarAcao(emprestimo) {
    if (emprestimo.status === "devolvido") {
      return '<span class="muted">—</span>';
    }

    if (emprestimo.devolucao_solicitada) {
      return '<span class="muted">Aguardando bibliotecário</span>';
    }

    return `
      <button
        class="btn btn-sm"
        data-acao="devolver"
        data-id="${emprestimo.id}"
        data-titulo="${escapeHtml(emprestimo.livro_titulo)}"
      >
        Solicitar devolução
      </button>`;
  }

  async function carregarEmprestimos() {
    try {
      const emprestimos = await apiFetch("/emprestimos");
      renderizarEmprestimos(emprestimos);
    } catch (erro) {
      mostrarAlerta(erro.message, "error");
      tabelaEmprestimos.innerHTML =
        '<tr class="empty-row"><td colspan="6">Não foi possível carregar seus empréstimos.</td></tr>';
    }
  }

  function renderizarEmprestimos(emprestimos) {
    if (!emprestimos.length) {
      tabelaEmprestimos.innerHTML =
        '<tr class="empty-row"><td colspan="6">Você ainda não fez nenhum empréstimo.</td></tr>';
      return;
    }

    tabelaEmprestimos.innerHTML = emprestimos
      .map(
        (emp) => `
        <tr>
          <td>${escapeHtml(emp.livro_titulo)}</td>
          <td>${escapeHtml(emp.livro_autor)}</td>
          <td class="mono">${formatarData(emp.data_emprestimo)}</td>
          <td class="mono">${formatarData(emp.data_devolucao_prevista)}</td>
          <td>${renderizarStatus(emp)}</td>
          <td class="actions-cell">${renderizarAcao(emp)}</td>
        </tr>`
      )
      .join("");
  }

  tabelaEmprestimos.addEventListener("click", async (evento) => {
    const botao = evento.target.closest("button[data-acao='devolver']");
    if (!botao) return;

    const id = botao.dataset.id;
    const titulo = botao.dataset.titulo;

    if (!confirm(`Confirmar entrega física de "${titulo}"?\nO bibliotecário ainda precisará registrar a devolução no sistema.`)) return;

    esconderAlerta();
    botao.disabled = true;

    try {
      await apiFetch(`/emprestimos/${id}/solicitar-devolucao`, { method: "PUT" });
      mostrarAlerta("Devolução solicitada. O bibliotecário confirmará em breve.", "success");
      await carregarEmprestimos();
    } catch (erro) {
      mostrarAlerta(erro.message, "error");
      botao.disabled = false;
    }
  });

  /* ---------------------------------------------------------
     Inicialização
     --------------------------------------------------------- */

  carregarLivros();
  carregarEmprestimos();
})();
