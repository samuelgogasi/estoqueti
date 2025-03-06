const express = require('express');
const path = require('path');
const app = express();
const db = require('./db');

// Middleware para processar JSON e arquivos estáticos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Middleware para log de requisições
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Rota para testar conexão com o banco
app.get('/api/test-db', async (req, res) => {
    try {
        const [result] = await db.query('SELECT 1');
        res.json({ success: true, message: 'Conexão com banco OK' });
    } catch (error) {
        console.error('Erro na conexão com banco:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para a página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para buscar categorias
app.get('/api/categorias', async (req, res) => {
    try {
        const [categorias] = await db.query('SELECT * FROM categorias ORDER BY nome');
        res.json(categorias);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para buscar produtos com suas categorias
app.get('/api/produtos', async (req, res) => {
    try {
        const [produtos] = await db.query(`
            SELECT 
                p.*,
                c.nome as categoria_nome
            FROM produtos p
            JOIN categorias c ON p.categoria_id = c.id
        `);
        res.json(produtos);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para buscar um produto específico
app.get('/api/produtos/:id', async (req, res) => {
    try {
        const [produto] = await db.query(
            'SELECT p.*, c.nome as categoria_nome FROM produtos p JOIN categorias c ON p.categoria_id = c.id WHERE p.id = ?',
            [req.params.id]
        );
        
        if (produto.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        res.json(produto[0]);
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para adicionar produto
app.post('/api/produtos', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const { categoria, tipo, modelo, serie, patrimonio, quantidade } = req.body;
        
        // Gerar ID único baseado em timestamp
        const id = `PROD${Date.now().toString().slice(-6)}`;
        
        // Primeiro, buscar o ID da categoria
        const [categorias] = await connection.execute(
            'SELECT id FROM categorias WHERE nome = ?',
            [categoria]
        );
        
        if (categorias.length === 0) {
            throw new Error('Categoria não encontrada');
        }
        
        const categoria_id = categorias[0].id;
        
        // Inserir produto
        await connection.execute(
            'INSERT INTO produtos (id, categoria_id, tipo, modelo, numero_serie, patrimonio, quantidade) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, categoria_id, tipo, modelo, serie || 'N/A', patrimonio || 'N/A', quantidade]
        );

        // Inserir movimentação inicial
        await connection.execute(
            'INSERT INTO movimentacoes (usuario, produto_id, categoria_id, tipo_produto, modelo, numero_serie, patrimonio, destino, quantidade, tipo_movimentacao, chamado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['Sistema', id, categoria_id, tipo, modelo, serie || 'N/A', patrimonio || 'N/A', 'Estoque', quantidade, 'entrada', 'Cadastro inicial']
        );

        await connection.commit();
        res.json({ success: true });
    } catch (error) {
        await connection.rollback();
        console.error('Erro na transação:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// Rota para registrar movimentação
app.post('/api/movimentacoes', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const { usuario, categoria, tipoProd, modelo, serie, patrimonio, destino, quantidade, tipo, chamado } = req.body;
        
        // Buscar categoria_id
        const [categorias] = await connection.execute(
            'SELECT id FROM categorias WHERE nome = ?',
            [categoria]
        );
        
        if (categorias.length === 0) {
            throw new Error('Categoria não encontrada');
        }
        
        const categoria_id = categorias[0].id;
        
        // Buscar produto
        const [produtos] = await connection.execute(
            'SELECT id, quantidade FROM produtos WHERE categoria_id = ? AND tipo = ? AND modelo = ?',
            [categoria_id, tipoProd, modelo]
        );

        if (produtos.length === 0) {
            throw new Error('Produto não encontrado');
        }

        const produto = produtos[0];

        if (tipo === 'saida' && produto.quantidade < quantidade) {
            throw new Error('Quantidade insuficiente em estoque');
        }

        // Registrar movimentação
        await connection.execute(
            'INSERT INTO movimentacoes (usuario, produto_id, categoria_id, tipo_produto, modelo, numero_serie, patrimonio, destino, quantidade, tipo_movimentacao, chamado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [usuario, produto.id, categoria_id, tipoProd, modelo, serie || 'N/A', patrimonio || 'N/A', destino, quantidade, tipo, chamado || 'N/A']
        );

        // Atualizar quantidade do produto
        const novaQuantidade = tipo === 'entrada' 
            ? produto.quantidade + quantidade 
            : produto.quantidade - quantidade;

        await connection.execute(
            'UPDATE produtos SET quantidade = ? WHERE id = ?',
            [novaQuantidade, produto.id]
        );

        await connection.commit();
        res.json({ success: true });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao registrar movimentação:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// Rota para buscar movimentações
app.get('/api/movimentacoes', async (req, res) => {
    try {
        const [movimentacoes] = await db.query(`
            SELECT 
                m.*,
                c.nome as categoria_nome,
                p.tipo as produto_tipo,
                p.modelo as produto_modelo
            FROM movimentacoes m
            JOIN categorias c ON m.categoria_id = c.id
            JOIN produtos p ON m.produto_id = p.id
            ORDER BY m.data_movimentacao DESC
        `);
        res.json(movimentacoes);
    } catch (error) {
        console.error('Erro ao buscar movimentações:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para buscar impressoras
app.get('/api/impressoras', async (req, res) => {
    try {
        const [impressoras] = await db.query('SELECT * FROM view_impressoras');
        res.json(impressoras);
    } catch (error) {
        console.error('Erro ao buscar impressoras:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para adicionar impressora
app.post('/api/impressoras', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const { 
            modelo, 
            tipo,
            serie, 
            patrimonio, 
            quantidade,
            ip,
            mac_address,
            localizacao,
            observacoes
        } = req.body;

        // Buscar ID da categoria Impressoras
        const [categorias] = await connection.execute(
            'SELECT id FROM categorias WHERE nome = ?',
            ['Impressoras']
        );

        if (categorias.length === 0) {
            throw new Error('Categoria Impressoras não encontrada');
        }

        const categoria_id = categorias[0].id;
        const produto_id = `IMP${Date.now().toString().slice(-6)}`;

        // Inserir produto base
        await connection.execute(
            'INSERT INTO produtos (id, categoria_id, tipo, modelo, numero_serie, patrimonio, quantidade) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [produto_id, categoria_id, tipo, modelo, serie || 'N/A', patrimonio || 'N/A', quantidade]
        );

        // Inserir dados específicos da impressora
        await connection.execute(
            'INSERT INTO impressoras (id, produto_id, modelo, ip, mac_address, localizacao, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [`IMP-${produto_id}`, produto_id, modelo, ip, mac_address, localizacao, observacoes]
        );

        // Registrar movimentação inicial
        await connection.execute(
            'INSERT INTO movimentacoes (usuario, produto_id, categoria_id, tipo_produto, modelo, numero_serie, patrimonio, destino, quantidade, tipo_movimentacao, chamado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['Sistema', produto_id, categoria_id, tipo, modelo, serie || 'N/A', patrimonio || 'N/A', localizacao, quantidade, 'entrada', 'Cadastro inicial']
        );

        await connection.commit();
        res.json({ success: true, id: produto_id });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao adicionar impressora:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// Rota para atualizar contador de páginas
app.put('/api/impressoras/:id/contador', async (req, res) => {
    try {
        const { id } = req.params;
        const { contador_paginas } = req.body;

        await db.execute(
            'UPDATE impressoras SET contador_paginas = ? WHERE id = ?',
            [contador_paginas, id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar contador:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para atualizar um produto
app.put('/api/produtos/:id', async (req, res) => {
    try {
        const { tipo, categoria_id, modelo, numero_serie, patrimonio, quantidade } = req.body;
        
        await db.query(
            `UPDATE produtos 
             SET tipo = ?, categoria_id = ?, modelo = ?, numero_serie = ?, 
                 patrimonio = ?, quantidade = ?
             WHERE id = ?`,
            [tipo, categoria_id, modelo, numero_serie, patrimonio, quantidade, req.params.id]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para excluir movimentações de um produto
app.delete('/api/produtos/:id/movimentacoes', async (req, res) => {
    try {
        // Primeiro, exclui todas as movimentações relacionadas ao produto
        await db.query('DELETE FROM movimentacoes WHERE produto_id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir movimentações:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para excluir produto
app.delete('/api/produtos/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM produtos WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para gerar relatórios
app.get('/api/relatorios/gerar', async (req, res) => {
    const { tipo, categoria, tipoFiltro } = req.query;
    
    try {
        let dados = [];
        
        if (tipo === 'produtos') {
            let query = `
                SELECT 
                    c.nome as categoria_nome,
                    p.tipo,
                    p.modelo,
                    SUM(p.quantidade) as quantidade
                FROM produtos p
                JOIN categorias c ON p.categoria_id = c.id
                WHERE 1=1
            `;
            
            const params = [];
            
            if (categoria) {
                query += ` AND c.nome = ?`;
                params.push(categoria);
            }
            
            if (tipoFiltro) {
                query += ` AND p.tipo LIKE ?`;
                params.push(`%${tipoFiltro}%`);
            }
            
            query += ` GROUP BY c.nome, p.tipo, p.modelo`;
            
            [dados] = await db.query(query, params);
            
        } else if (tipo === 'movimentacoes') {
            let query = `
                SELECT 
                    m.tipo_movimentacao,
                    p.modelo,
                    m.quantidade,
                    m.destino
                FROM movimentacoes m
                JOIN produtos p ON m.produto_id = p.id
                JOIN categorias c ON p.categoria_id = c.id
                WHERE 1=1
            `;
            
            const params = [];
            
            if (categoria) {
                query += ` AND c.nome = ?`;
                params.push(categoria);
            }
            
            if (tipoFiltro) {
                query += ` AND p.tipo LIKE ?`;
                params.push(`%${tipoFiltro}%`);
            }
            
            [dados] = await db.query(query, params);
        }
        
        res.json(dados);
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para buscar dados completos dos relatórios
app.get('/api/relatorios/dados-completos', async (req, res) => {
    try {
        // Busca resumo geral
        const [[resumo]] = await db.query(`
            SELECT 
                COUNT(DISTINCT p.id) as totalProdutos,
                COUNT(DISTINCT c.id) as totalCategorias,
                (SELECT COUNT(*) FROM movimentacoes 
                 WHERE DATE(data_movimentacao) = CURDATE()) as movimentacoesDia
            FROM produtos p
            JOIN categorias c ON p.categoria_id = c.id
        `);

        // Busca produtos críticos (quantidade <= 5)
        const [produtosCriticos] = await db.query(`
            SELECT 
                c.nome as categoria_nome,
                p.tipo,
                p.modelo,
                p.quantidade,
                p.numero_serie,
                p.patrimonio
            FROM produtos p
            JOIN categorias c ON p.categoria_id = c.id
            WHERE p.quantidade <= 5
            ORDER BY p.quantidade ASC
        `);

        // Busca movimentações detalhadas
        const [movimentacoes] = await db.query(`
            SELECT 
                m.data_movimentacao,
                m.tipo_movimentacao,
                p.modelo as produto_modelo,
                p.tipo as produto_tipo,
                p.numero_serie,
                p.patrimonio,
                m.quantidade,
                m.destino,
                m.usuario,
                m.chamado,
                m.observacao
            FROM movimentacoes m
            JOIN produtos p ON m.produto_id = p.id
            JOIN categorias c ON p.categoria_id = c.id
            ORDER BY m.data_movimentacao DESC
            LIMIT 20
        `);

        // Busca distribuição por categoria
        const [distribuicaoCategorias] = await db.query(`
            SELECT 
                c.nome as categoria,
                COUNT(p.id) as total_produtos,
                SUM(p.quantidade) as total_itens
            FROM categorias c
            LEFT JOIN produtos p ON c.id = p.categoria_id
            GROUP BY c.id, c.nome
            ORDER BY total_itens DESC
        `);

        res.json({
            resumo,
            produtosCriticos,
            movimentacoes,
            distribuicaoCategorias
        });
    } catch (error) {
        console.error('Erro ao buscar dados dos relatórios:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para gerar relatório de movimentações
app.get('/api/relatorios/movimentacoes', async (req, res) => {
    console.log('Recebida requisição para relatório de movimentações');
    const { dataInicio, dataFim } = req.query;
    
    try {
        const [movimentacoes] = await db.query(`
            SELECT 
                m.data_movimentacao,
                m.tipo_movimentacao,
                c.nome as categoria,
                p.tipo,
                p.modelo,
                p.numero_serie,
                p.patrimonio,
                m.quantidade,
                m.destino,
                m.usuario,
                m.chamado
            FROM movimentacoes m
            JOIN produtos p ON m.produto_id = p.id
            JOIN categorias c ON p.categoria_id = c.id
            WHERE DATE(m.data_movimentacao) BETWEEN ? AND ?
            ORDER BY m.data_movimentacao DESC
        `, [dataInicio, dataFim]);

        console.log(`Encontradas ${movimentacoes.length} movimentações`);
        res.json(movimentacoes);
    } catch (error) {
        console.error('Erro ao buscar movimentações:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack 
        });
    }
});

// Rota para buscar todas as movimentacoes
app.get('/api/relatorios/todas-movimentacoes', async (req, res) => {
    try {
        const [movimentacoes] = await db.query(`
            SELECT 
                m.data_movimentacao,
                m.tipo_movimentacao,
                p.tipo,
                p.modelo,
                p.numero_serie,
                p.patrimonio,
                m.quantidade,
                m.usuario,
                m.destino,
                m.chamado
            FROM movimentacoes m
            JOIN produtos p ON m.produto_id = p.id
            ORDER BY m.data_movimentacao DESC
            LIMIT 100
        `);

        res.json(movimentacoes);
    } catch (error) {
        console.error('Erro ao buscar movimentações:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse http://localhost:${PORT}`);
}); 