const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // seu usuário do MySQL
    password: 'samuel00', // sua senha do MySQL
    database: 'estoque_ti', // nome do banco que vamos criar
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