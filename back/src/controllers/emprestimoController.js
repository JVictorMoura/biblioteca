const db = require('../config/database');

const DIAS_PRAZO_PADRAO = 14;

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}


function atualizarAtrasados() {
  db.prepare(
    `UPDATE emprestimos
     SET status = 'atrasado'
     WHERE status = 'ativo'
       AND data_devolucao_real IS NULL
       AND data_devolucao_prevista < ?`
  ).run(hojeISO());
}


function listar(req, res) {
  atualizarAtrasados();

  const { perfil, id: usuarioId } = req.usuario;
  let emprestimos;

  if (perfil === 'bibliotecario') {
    const { leitor_id } = req.query;

    const baseQuery = `
      SELECT e.*, l.titulo AS livro_titulo, l.autor AS livro_autor, u.nome AS leitor_nome
      FROM emprestimos e
      JOIN livros l ON l.id = e.livro_id
      JOIN usuarios u ON u.id = e.leitor_id`;

    if (leitor_id) {
      emprestimos = db
        .prepare(`${baseQuery} WHERE e.leitor_id = ? ORDER BY e.data_emprestimo DESC`)
        .all(leitor_id);
    } else {
      emprestimos = db.prepare(`${baseQuery} ORDER BY e.data_emprestimo DESC`).all();
    }
  } else {
    emprestimos = db
      .prepare(
        `SELECT e.*, l.titulo AS livro_titulo, l.autor AS livro_autor
         FROM emprestimos e
         JOIN livros l ON l.id = e.livro_id
         WHERE e.leitor_id = ?
         ORDER BY e.data_emprestimo DESC`
      )
      .all(usuarioId);
  }

  res.json(emprestimos);
}


function obterPorId(req, res) {
  atualizarAtrasados();

  const { id } = req.params;
  const emprestimo = db
    .prepare(
      `SELECT e.*, l.titulo AS livro_titulo, l.autor AS livro_autor, u.nome AS leitor_nome
       FROM emprestimos e
       JOIN livros l ON l.id = e.livro_id
       JOIN usuarios u ON u.id = e.leitor_id
       WHERE e.id = ?`
    )
    .get(id);

  if (!emprestimo) {
    return res.status(404).json({ erro: 'Empréstimo não encontrado.' });
  }

  const { perfil, id: usuarioId } = req.usuario;
  if (perfil === 'leitor' && emprestimo.leitor_id !== usuarioId) {
    return res.status(403).json({ erro: 'Acesso negado a este empréstimo.' });
  }

  res.json(emprestimo);
}


function criar(req, res) {
  const { livro_id, data_devolucao_prevista } = req.body;
  const leitor_id = req.usuario.id;

  if (!livro_id) {
    return res.status(400).json({ erro: 'O campo livro_id é obrigatório.' });
  }

  const livro = db.prepare('SELECT * FROM livros WHERE id = ?').get(livro_id);
  if (!livro) {
    return res.status(404).json({ erro: 'Livro não encontrado.' });
  }

  if (livro.quantidade_disponivel <= 0) {
    return res.status(409).json({ erro: 'Não há exemplares disponíveis deste livro para empréstimo.' });
  }

  const dataEmprestimo = hojeISO();

  let dataPrevista = data_devolucao_prevista;
  if (!dataPrevista) {
    const prazo = new Date();
    prazo.setDate(prazo.getDate() + DIAS_PRAZO_PADRAO);
    dataPrevista = prazo.toISOString().slice(0, 10);
  }

  const inserirEmprestimo = db.prepare(
    `INSERT INTO emprestimos (livro_id, leitor_id, data_emprestimo, data_devolucao_prevista, status)
     VALUES (?, ?, ?, ?, 'ativo')`
  );
  const diminuirEstoque = db.prepare(
    'UPDATE livros SET quantidade_disponivel = quantidade_disponivel - 1 WHERE id = ?'
  );

  const novoId = db.transaction(() => {
    const resultado = inserirEmprestimo.run(livro_id, leitor_id, dataEmprestimo, dataPrevista);
    diminuirEstoque.run(livro_id);
    return resultado.lastInsertRowid;
  })();

  const novoEmprestimo = db.prepare('SELECT * FROM emprestimos WHERE id = ?').get(novoId);

  res.status(201).json({ mensagem: 'Empréstimo registrado com sucesso.', emprestimo: novoEmprestimo });
}


function solicitarDevolucao(req, res) {
  const { id } = req.params;
  const leitor_id = req.usuario.id;

  const emprestimo = db.prepare('SELECT * FROM emprestimos WHERE id = ?').get(id);
  if (!emprestimo) {
    return res.status(404).json({ erro: 'Empréstimo não encontrado.' });
  }

  if (emprestimo.leitor_id !== leitor_id) {
    return res.status(403).json({ erro: 'Acesso negado a este empréstimo.' });
  }

  if (emprestimo.status === 'devolvido') {
    return res.status(409).json({ erro: 'Este empréstimo já foi devolvido.' });
  }

  if (emprestimo.devolucao_solicitada) {
    return res.status(409).json({ erro: 'A devolução já foi solicitada para este empréstimo.' });
  }

  db.prepare('UPDATE emprestimos SET devolucao_solicitada = 1 WHERE id = ?').run(id);

  const atualizado = db.prepare('SELECT * FROM emprestimos WHERE id = ?').get(id);

  res.json({ mensagem: 'Devolução solicitada com sucesso. O bibliotecário confirmará em breve.', emprestimo: atualizado });
}


function atualizarStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const STATUS_VALIDOS = ['ativo', 'devolvido', 'atrasado'];
  if (!status || !STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ erro: "O campo status deve ser 'ativo', 'devolvido' ou 'atrasado'." });
  }

  const emprestimo = db.prepare('SELECT * FROM emprestimos WHERE id = ?').get(id);
  if (!emprestimo) {
    return res.status(404).json({ erro: 'Empréstimo não encontrado.' });
  }

  if (status === 'devolvido') {
    if (emprestimo.status === 'devolvido') {
      return res.status(409).json({ erro: 'Este empréstimo já foi devolvido.' });
    }

    const atualizarEmprestimo = db.prepare(
      "UPDATE emprestimos SET status = 'devolvido', data_devolucao_real = ?, devolucao_solicitada = 0 WHERE id = ?"
    );
    const aumentarEstoque = db.prepare(
      'UPDATE livros SET quantidade_disponivel = quantidade_disponivel + 1 WHERE id = ?'
    );

    db.transaction(() => {
      atualizarEmprestimo.run(hojeISO(), emprestimo.id);
      aumentarEstoque.run(emprestimo.livro_id);
    })();
  } else {
    db.prepare('UPDATE emprestimos SET status = ? WHERE id = ?').run(status, id);
  }

  const atualizado = db.prepare('SELECT * FROM emprestimos WHERE id = ?').get(id);

  res.json({ mensagem: 'Status do empréstimo atualizado com sucesso.', emprestimo: atualizado });
}


function remover(req, res) {
  const { id } = req.params;

  const emprestimo = db.prepare('SELECT * FROM emprestimos WHERE id = ?').get(id);
  if (!emprestimo) {
    return res.status(404).json({ erro: 'Empréstimo não encontrado.' });
  }

  const aumentarEstoque = db.prepare(
    'UPDATE livros SET quantidade_disponivel = quantidade_disponivel + 1 WHERE id = ?'
  );
  const deletarEmprestimo = db.prepare('DELETE FROM emprestimos WHERE id = ?');

  db.transaction(() => {
  
    if (emprestimo.status !== 'devolvido') {
      aumentarEstoque.run(emprestimo.livro_id);
    }
    deletarEmprestimo.run(id);
  })();

  res.json({ mensagem: 'Empréstimo removido com sucesso.' });
}

module.exports = { listar, obterPorId, criar, solicitarDevolucao, atualizarStatus, remover };
