const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto';

/**
 * Verifica se o token JWT enviado no header Authorization é válido.
 * Em caso positivo, anexa os dados do usuário em req.usuario.
 */
function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload; // { id, nome, email, perfil }
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

/**
 * Garante que o usuário autenticado possui um dos perfis permitidos.
 * Uso: autorizar('bibliotecario') ou autorizar('bibliotecario', 'leitor')
 */
function autorizar(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({ erro: 'Acesso negado para este perfil de usuário.' });
    }
    next();
  };
}

module.exports = { autenticar, autorizar, JWT_SECRET };
