const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'samuel00',
    database: process.env.DB_NAME || 'estoque_ti',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Testar conexão ao iniciar
pool.getConnection()
    .then(connection => {
        console.log('Conexão com banco de dados estabelecida com sucesso!');
        connection.release();
    })
    .catch(err => {
        console.error('Erro ao conectar ao banco de dados:', err);
        process.exit(1); // Encerra a aplicação se não conseguir conectar ao banco
    });

module.exports = pool; 