const express = require('express');
const router = express.Router();
const { autenticar, autorizar } = require('../middleware/auth');
const emprestimoController = require('../controllers/emprestimoController');


router.get('/', autenticar, emprestimoController.listar);


router.get('/:id', autenticar, emprestimoController.obterPorId);


router.post('/', autenticar, autorizar('leitor'), emprestimoController.criar);


router.put('/:id/solicitar-devolucao', autenticar, autorizar('leitor'), emprestimoController.solicitarDevolucao);


router.put('/:id', autenticar, autorizar('bibliotecario'), emprestimoController.atualizarStatus);


router.delete('/:id', autenticar, autorizar('bibliotecario'), emprestimoController.remover);

module.exports = router;
