const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');

const PERFIS_VALIDOS = ['bibliotecario', 'leitor'];


function registrar(req, res) {
  const { nome, email, senha, perfil } = req.body;

  if (!nome || !email || !senha || !perfil) {
    return res.status(400).json({ erro: 'Nome, email, senha e perfil são obrigatórios.' });
  }

  if (!PERFIS_VALIDOS.includes(perfil)) {
    return res.status(400).json({ erro: "Perfil deve ser 'bibliotecario' ou 'leitor'." });
  }

  const existente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existente) {
    return res.status(409).json({ erro: 'Já existe um usuário cadastrado com este email.' });
  }

  const senhaHash = bcrypt.hashSync(senha, 10);

  const resultado = db
    .prepare('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)')
    .run(nome, email, senhaHash, perfil);

  return res.status(201).json({
    mensagem: 'Usuário cadastrado com sucesso.',
    usuario: { id: resultado.lastInsertRowid, nome, email, perfil },
  });
}


function login(req, res) {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });
  }

  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);

  if (!usuario || !bcrypt.compareSync(senha, usuario.senha)) {
    return res.status(401).json({ erro: 'Email ou senha inválidos.' });
  }

  const token = jwt.sign(
    { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  return res.json({
    mensagem: 'Login realizado com sucesso.',
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
  });
}

module.exports = { registrar, login };
