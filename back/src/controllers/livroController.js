const db = require('../config/database');

// GET /api/livros - lista todos os livros disponíveis
function listar(req, res) {
  const livros = db.prepare('SELECT * FROM livros ORDER BY titulo').all();
  res.json(livros);
}

// GET /api/livros/:id - obtém detalhes de um livro específico
function obterPorId(req, res) {
  const { id } = req.params;

  const livro = db.prepare('SELECT * FROM livros WHERE id = ?').get(id);
  if (!livro) {
    return res.status(404).json({ erro: 'Livro não encontrado.' });
  }

  res.json(livro);
}

// POST /api/livros - cadastra um novo livro (somente bibliotecário)
function criar(req, res) {
  const { titulo, autor, ano_publicacao, quantidade_disponivel } = req.body;

  if (!titulo || !autor || quantidade_disponivel === undefined) {
    return res.status(400).json({
      erro: 'Os campos titulo, autor e quantidade_disponivel são obrigatórios.',
    });
  }

  if (Number(quantidade_disponivel) < 0) {
    return res.status(400).json({ erro: 'quantidade_disponivel não pode ser negativa.' });
  }

  const resultado = db
    .prepare(
      'INSERT INTO livros (titulo, autor, ano_publicacao, quantidade_disponivel) VALUES (?, ?, ?, ?)'
    )
    .run(titulo, autor, ano_publicacao ?? null, quantidade_disponivel);

  const novoLivro = db.prepare('SELECT * FROM livros WHERE id = ?').get(resultado.lastInsertRowid);

  res.status(201).json({ mensagem: 'Livro cadastrado com sucesso.', livro: novoLivro });
}

// PUT /api/livros/:id - atualiza dados de um livro (somente bibliotecário)
function atualizar(req, res) {
  const { id } = req.params;

  const livro = db.prepare('SELECT * FROM livros WHERE id = ?').get(id);
  if (!livro) {
    return res.status(404).json({ erro: 'Livro não encontrado.' });
  }

  const { titulo, autor, ano_publicacao, quantidade_disponivel } = req.body;

  if (quantidade_disponivel !== undefined && Number(quantidade_disponivel) < 0) {
    return res.status(400).json({ erro: 'quantidade_disponivel não pode ser negativa.' });
  }

  const novoTitulo = titulo ?? livro.titulo;
  const novoAutor = autor ?? livro.autor;
  const novoAno = ano_publicacao ?? livro.ano_publicacao;
  const novaQuantidade = quantidade_disponivel ?? livro.quantidade_disponivel;

  db.prepare(
    'UPDATE livros SET titulo = ?, autor = ?, ano_publicacao = ?, quantidade_disponivel = ? WHERE id = ?'
  ).run(novoTitulo, novoAutor, novoAno, novaQuantidade, id);

  const atualizado = db.prepare('SELECT * FROM livros WHERE id = ?').get(id);

  res.json({ mensagem: 'Livro atualizado com sucesso.', livro: atualizado });
}

// DELETE /api/livros/:id - remove um livro do sistema (somente bibliotecário)
function remover(req, res) {
  const { id } = req.params;

  const livro = db.prepare('SELECT * FROM livros WHERE id = ?').get(id);
  if (!livro) {
    return res.status(404).json({ erro: 'Livro não encontrado.' });
  }

  const emprestimoAtivo = db
    .prepare("SELECT id FROM emprestimos WHERE livro_id = ? AND status != 'devolvido'")
    .get(id);

  if (emprestimoAtivo) {
    return res
      .status(409)
      .json({ erro: 'Não é possível remover: existem empréstimos ativos para este livro.' });
  }

  db.prepare('DELETE FROM livros WHERE id = ?').run(id);

  res.json({ mensagem: 'Livro removido com sucesso.' });
}

module.exports = { listar, obterPorId, criar, atualizar, remover };
