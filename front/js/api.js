/* ============================================================
   api.js — funções compartilhadas: chamadas HTTP, sessão e
   utilitários usados pelas três páginas do frontend.
   ============================================================ */

// Usa caminho relativo — o backend serve os arquivos estáticos
const API_BASE_URL = "/api";

const STORAGE_TOKEN = "acervo_token";
const STORAGE_USUARIO = "acervo_usuario";

/* ---------- Sessão ---------- */

function getToken() {
    return localStorage.getItem(STORAGE_TOKEN);
}

function getUsuario() {
    const dados = localStorage.getItem(STORAGE_USUARIO);
    return dados ? JSON.parse(dados) : null;
}

function salvarSessao(token, usuario) {
    localStorage.setItem(STORAGE_TOKEN, token);
    localStorage.setItem(STORAGE_USUARIO, JSON.stringify(usuario));
}

function limparSessao() {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USUARIO);
}

function sair() {
    limparSessao();
    window.location.href = "index.html";
}

/**
 * Garante que existe uma sessão válida com o perfil esperado.
 * Caso contrário, redireciona para a página correta.
 * Retorna os dados do usuário logado.
 */
function exigirPerfil(perfilEsperado) {
    const usuario = getUsuario();
    const token = getToken();

    if (!token || !usuario) {
        window.location.href = "index.html";
        return null;
    }

    if (usuario.perfil !== perfilEsperado) {
        window.location.href =
            usuario.perfil === "bibliotecario" ? "bibliotecario.html" : "leitor.html";
        return null;
    }

    return usuario;
}

/* ---------- Chamadas à API ---------- */

/**
 * Faz uma chamada à API, anexando o token JWT (se houver) e
 * tratando o corpo da resposta como JSON.
 * Lança um erro com `.status` e `.mensagem` em caso de falha.
 */
async function apiFetch(caminho, opcoes = {}) {
    const headers = { "Content-Type": "application/json", ...(opcoes.headers || {}) };
    const token = getToken();
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    let resposta;
    try {
        resposta = await fetch(`${API_BASE_URL}${caminho}`, {...opcoes, headers });
    } catch (erroRede) {
        const erro = new Error(
            "Não foi possível conectar ao servidor. Verifique se o backend está rodando."
        );
        erro.status = 0;
        throw erro;
    }

    let dados = {};
    try {
        dados = await resposta.json();
    } catch (_) {
        dados = {};
    }

    if (!resposta.ok) {
        if (resposta.status === 401) {
            limparSessao();
        }
        const mensagem = dados.erro || `Erro inesperado (status ${resposta.status}).`;
        const erro = new Error(mensagem);
        erro.status = resposta.status;
        throw erro;
    }

    return dados;
}

/* ---------- Formatação ---------- */

function formatarData(dataISO) {
    if (!dataISO) return "—";
    const partes = dataISO.split("-");
    if (partes.length !== 3) return dataISO;
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
}

function escapeHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
}
