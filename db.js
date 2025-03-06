const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 3,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: false
    }
});

// Adicionar tratamento de erro global para o pool
pool.on('error', (err) => {
    console.error('Erro no pool de conexões:', err);
});

// Teste de conexão inicial
pool.getConnection()
    .then(connection => {
        console.log('Conectado ao banco de dados MySQL');
        connection.release();
    })
    .catch(err => {
        console.error('Erro ao conectar ao banco:', err);
    });

module.exports = pool; 