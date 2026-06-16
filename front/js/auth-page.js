/* ============================================================
   auth-page.js — lógica da página index.html (login e cadastro)
   ============================================================ */

(function () {
  // Se já existe uma sessão válida, vai direto para o painel correspondente
  const usuarioExistente = getUsuario();
  if (usuarioExistente && getToken()) {
    window.location.href =
      usuarioExistente.perfil === "bibliotecario" ? "bibliotecario.html" : "leitor.html";
    return;
  }

  const tabLogin = document.getElementById("tab-login");
  const tabRegistro = document.getElementById("tab-registro");
  const formLogin = document.getElementById("form-login");
  const formRegistro = document.getElementById("form-registro");
  const alerta = document.getElementById("alerta");

  function mostrarAlerta(mensagem, tipo) {
    alerta.textContent = mensagem;
    alerta.className = `alert alert-${tipo}`;
    alerta.classList.remove("hidden");
  }

  function esconderAlerta() {
    alerta.classList.add("hidden");
  }

  function ativarAba(aba) {
    esconderAlerta();
    if (aba === "login") {
      tabLogin.classList.add("active");
      tabRegistro.classList.remove("active");
      formLogin.classList.remove("hidden");
      formRegistro.classList.add("hidden");
    } else {
      tabRegistro.classList.add("active");
      tabLogin.classList.remove("active");
      formRegistro.classList.remove("hidden");
      formLogin.classList.add("hidden");
    }
  }

  tabLogin.addEventListener("click", () => ativarAba("login"));
  tabRegistro.addEventListener("click", () => ativarAba("registro"));

  function redirecionarPorPerfil(perfil) {
    window.location.href = perfil === "bibliotecario" ? "bibliotecario.html" : "leitor.html";
  }

  formLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    esconderAlerta();

    const email = document.getElementById("login-email").value.trim();
    const senha = document.getElementById("login-senha").value;

    const botao = formLogin.querySelector("button[type=submit]");
    botao.disabled = true;

    try {
      const resposta = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, senha }),
      });

      salvarSessao(resposta.token, resposta.usuario);
      redirecionarPorPerfil(resposta.usuario.perfil);
    } catch (erro) {
      mostrarAlerta(erro.message, "error");
    } finally {
      botao.disabled = false;
    }
  });

  formRegistro.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    esconderAlerta();

    const nome = document.getElementById("reg-nome").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const senha = document.getElementById("reg-senha").value;
    const perfil = document.getElementById("reg-perfil").value;

    const botao = formRegistro.querySelector("button[type=submit]");
    botao.disabled = true;

    try {
      await apiFetch("/auth/registrar", {
        method: "POST",
        body: JSON.stringify({ nome, email, senha, perfil }),
      });

      // Após cadastrar, faz login automaticamente
      const resposta = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, senha }),
      });

      salvarSessao(resposta.token, resposta.usuario);
      redirecionarPorPerfil(resposta.usuario.perfil);
    } catch (erro) {
      mostrarAlerta(erro.message, "error");
    } finally {
      botao.disabled = false;
    }
  });
})();
