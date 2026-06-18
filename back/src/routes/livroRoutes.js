const express = require('express');
const router = express.Router();
const { autenticar, autorizar } = require('../middleware/auth');
const livroController = require('../controllers/livroController');


router.get('/', autenticar, livroController.listar);


router.get('/:id', autenticar, livroController.obterPorId);


router.post('/', autenticar, autorizar('bibliotecario'), livroController.criar);


router.put('/:id', autenticar, autorizar('bibliotecario'), livroController.atualizar);


router.delete('/:id', autenticar, autorizar('bibliotecario'), livroController.remover);

module.exports = router;
