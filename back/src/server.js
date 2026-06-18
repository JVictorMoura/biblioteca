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


app.use(express.static(path.join(__dirname, '..', '..', 'front')));


app.use('/api/auth', authRoutes);
app.use('/api/livros', livroRoutes);
app.use('/api/emprestimos', emprestimoRoutes);


app.get('/api', (req, res) => {
    res.json({ mensagem: 'API da Biblioteca está funcionando.' });
});


app.use('/api/*', (req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada.' });
});


app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'front', 'index.html'));
});


app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});