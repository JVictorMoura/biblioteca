const express = require('express');
const router = express.Router();
const { autenticar, autorizar } = require('../middleware/auth');
const emprestimoController = require('../controllers/emprestimoController');

// GET /api/emprestimos - leitor vê os próprios, bibliotecário vê todos
router.get('/', autenticar, emprestimoController.listar);

// GET /api/emprestimos/:id - detalhes de um empréstimo
router.get('/:id', autenticar, emprestimoController.obterPorId);

// POST /api/emprestimos - apenas leitor pode solicitar empréstimo
router.post('/', autenticar, autorizar('leitor'), emprestimoController.criar);

// PUT /api/emprestimos/:id/solicitar-devolucao - leitor solicita devolução
router.put('/:id/solicitar-devolucao', autenticar, autorizar('leitor'), emprestimoController.solicitarDevolucao);

// PUT /api/emprestimos/:id - apenas bibliotecário atualiza status (ex: devolvido)
router.put('/:id', autenticar, autorizar('bibliotecario'), emprestimoController.atualizarStatus);

// DELETE /api/emprestimos/:id - apenas bibliotecário pode cancelar/remover
router.delete('/:id', autenticar, autorizar('bibliotecario'), emprestimoController.remover);

module.exports = router;
