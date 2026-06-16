/* ============================================================
   bibliotecario.js — lógica do painel do bibliotecário
   ============================================================ */

(function () {
  const usuario = exigirPerfil("bibliotecario");
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

  const formLivro = document.getElementById("form-livro");
  const campoLivroId = document.getElementById("livro-id");
  const campoTitulo = document.getElementById("livro-titulo");
  const campoAutor = document.getElementById("livro-autor");
  const campoAno = document.getElementById("livro-ano");
  const campoQuantidade = document.getElementById("livro-quantidade");
  const btnSalvarLivro = document.getElementById("btn-salvar-livro");
  const btnCancelarEdicao = document.getElementById("btn-cancelar-edicao");
  const rotuloFormLivro = document.getElementById("rotulo-form-livro");
  const tabelaLivros = document.getElementById("tabela-livros");

  function limparFormLivro() {
    formLivro.reset();
    campoLivroId.value = "";
    btnSalvarLivro.textContent = "Adicionar livro";
    btnCancelarEdicao.classList.add("hidden");
    rotuloFormLivro.textContent = "001 · novo livro";
  }

  function iniciarEdicaoLivro(livro) {
    campoLivroId.value = livro.id;
    campoTitulo.value = livro.titulo;
    campoAutor.value = livro.autor;
    campoAno.value = livro.ano_publicacao ?? "";
    campoQuantidade.value = livro.quantidade_disponivel;
    btnSalvarLivro.textContent = "Salvar alterações";
    btnCancelarEdicao.classList.remove("hidden");
    rotuloFormLivro.textContent = `001 · editando livro #${livro.id}`;
    campoTitulo.scrollIntoView({ behavior: "smooth", block: "center" });
    campoTitulo.focus();
  }

  btnCancelarEdicao.addEventListener("click", limparFormLivro);

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
        '<tr class="empty-row"><td colspan="6">Nenhum livro cadastrado ainda.</td></tr>';
      return;
    }

    tabelaLivros.innerHTML = livros
      .map(
        (livro) => `
        <tr>
          <td class="mono">#${livro.id}</td>
          <td>${escapeHtml(livro.titulo)}</td>
          <td>${escapeHtml(livro.autor)}</td>
          <td class="mono">${livro.ano_publicacao ?? "—"}</td>
          <td class="mono">${livro.quantidade_disponivel}</td>
          <td class="actions-cell">
            <button class="btn btn-sm" data-acao="editar" data-id="${livro.id}">Editar</button>
            <button class="btn btn-sm btn-danger" data-acao="excluir" data-id="${livro.id}">Excluir</button>
          </td>
        </tr>`
      )
      .join("");
  }

  tabelaLivros.addEventListener("click", async (evento) => {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;

    const id = botao.dataset.id;
    esconderAlerta();

    if (botao.dataset.acao === "editar") {
      try {
        const livro = await apiFetch(`/livros/${id}`);
        iniciarEdicaoLivro(livro);
      } catch (erro) {
        mostrarAlerta(erro.message, "error");
      }
    }

    if (botao.dataset.acao === "excluir") {
      if (!confirm("Remover este livro do acervo?")) return;
      try {
        await apiFetch(`/livros/${id}`, { method: "DELETE" });
        if (campoLivroId.value === id) limparFormLivro();
        await carregarLivros();
      } catch (erro) {
        mostrarAlerta(erro.message, "error");
      }
    }
  });

  formLivro.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    esconderAlerta();

    const corpo = {
      titulo: campoTitulo.value.trim(),
      autor: campoAutor.value.trim(),
      ano_publicacao: campoAno.value ? Number(campoAno.value) : null,
      quantidade_disponivel: Number(campoQuantidade.value),
    };

    const id = campoLivroId.value;
    btnSalvarLivro.disabled = true;

    try {
      if (id) {
        await apiFetch(`/livros/${id}`, { method: "PUT", body: JSON.stringify(corpo) });
      } else {
        await apiFetch("/livros", { method: "POST", body: JSON.stringify(corpo) });
      }
      limparFormLivro();
      await carregarLivros();
    } catch (erro) {
      mostrarAlerta(erro.message, "error");
    } finally {
      btnSalvarLivro.disabled = false;
    }
  });

  /* ---------------------------------------------------------
     Empréstimos
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
      html += ` <span class="stamp stamp--pendente">Devolução solicitada</span>`;
    }

    return html;
  }

  function renderizarAcoesEmprestimo(emprestimo) {
    if (emprestimo.status === "devolvido") {
      return '<span class="muted">—</span>';
    }

    return `
      <button class="btn btn-sm btn-primary" data-acao="confirmar-devolucao" data-id="${emprestimo.id}">
        Confirmar devolução
      </button>
      <button class="btn btn-sm btn-danger" data-acao="cancelar-emprestimo" data-id="${emprestimo.id}">
        Cancelar
      </button>`;
  }

  async function carregarEmprestimos() {
    try {
      const emprestimos = await apiFetch("/emprestimos");
      renderizarEmprestimos(emprestimos);
    } catch (erro) {
      mostrarAlerta(erro.message, "error");
      tabelaEmprestimos.innerHTML =
        '<tr class="empty-row"><td colspan="8">Não foi possível carregar os empréstimos.</td></tr>';
    }
  }

  function renderizarEmprestimos(emprestimos) {
    if (!emprestimos.length) {
      tabelaEmprestimos.innerHTML =
        '<tr class="empty-row"><td colspan="8">Nenhum empréstimo registrado ainda.</td></tr>';
      return;
    }

    tabelaEmprestimos.innerHTML = emprestimos
      .map(
        (emprestimo) => `
        <tr>
          <td class="mono">#${emprestimo.id}</td>
          <td>${escapeHtml(emprestimo.livro_titulo)}</td>
          <td>${escapeHtml(emprestimo.leitor_nome)}</td>
          <td class="mono">${formatarData(emprestimo.data_emprestimo)}</td>
          <td class="mono">${formatarData(emprestimo.data_devolucao_prevista)}</td>
          <td class="mono">${formatarData(emprestimo.data_devolucao_real)}</td>
          <td>${renderizarStatus(emprestimo)}</td>
          <td class="actions-cell">${renderizarAcoesEmprestimo(emprestimo)}</td>
        </tr>`
      )
      .join("");
  }

  tabelaEmprestimos.addEventListener("click", async (evento) => {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;

    const id = botao.dataset.id;
    esconderAlerta();

    if (botao.dataset.acao === "confirmar-devolucao") {
      try {
        await apiFetch(`/emprestimos/${id}`, {
          method: "PUT",
          body: JSON.stringify({ status: "devolvido" }),
        });
        await Promise.all([carregarEmprestimos(), carregarLivros()]);
      } catch (erro) {
        mostrarAlerta(erro.message, "error");
      }
    }

    if (botao.dataset.acao === "cancelar-emprestimo") {
      if (!confirm("Cancelar e remover este empréstimo?")) return;
      try {
        await apiFetch(`/emprestimos/${id}`, { method: "DELETE" });
        await Promise.all([carregarEmprestimos(), carregarLivros()]);
      } catch (erro) {
        mostrarAlerta(erro.message, "error");
      }
    }
  });

  /* ---------------------------------------------------------
     Inicialização
     --------------------------------------------------------- */

  carregarLivros();
  carregarEmprestimos();
})();
