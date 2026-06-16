require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const livroRoutes = require('./routes/livroRoutes');
const emprestimoRoutes = require('./routes/emprestimoRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Servir os arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '..', '..', 'front')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/livros', livroRoutes);
app.use('/api/emprestimos', emprestimoRoutes);

// Rota de teste / health check
app.get('/api', (req, res) => {
    res.json({ mensagem: 'API da Biblioteca está funcionando.' });
});

// Rota não encontrada (apenas para rotas /api)
app.use('/api/*', (req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada.' });
});

// Qualquer outra rota serve o frontend (SPA fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'front', 'index.html'));
});

// Tratamento de erros não previstos
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});