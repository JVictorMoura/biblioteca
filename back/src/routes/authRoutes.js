const express = require('express');
const router = express.Router();
const { registrar, login } = require('../controllers/authController');

// POST /api/auth/registrar
router.post('/registrar', registrar);

// POST /api/auth/login
router.post('/login', login);

module.exports = router;
