const express = require('express');
const router = express.Router();
const { autenticar, autorizar } = require('../middleware/auth');
const livroController = require('../controllers/livroController');

// GET /api/livros - qualquer usuário autenticado pode listar
router.get('/', autenticar, livroController.listar);

// GET /api/livros/:id - detalhes de um livro
router.get('/:id', autenticar, livroController.obterPorId);

// POST /api/livros - apenas bibliotecário pode cadastrar
router.post('/', autenticar, autorizar('bibliotecario'), livroController.criar);

// PUT /api/livros/:id - apenas bibliotecário pode atualizar
router.put('/:id', autenticar, autorizar('bibliotecario'), livroController.atualizar);

// DELETE /api/livros/:id - apenas bibliotecário pode remover
router.delete('/:id', autenticar, autorizar('bibliotecario'), livroController.remover);

module.exports = router;
