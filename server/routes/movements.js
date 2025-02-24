const router = require('express').Router();
const Movement = require('../models/Movement');
const Product = require('../models/Product');

router.post('/', async (req, res) => {
  try {
    const { user, productId, serialNumber, quantity, type, ticketNumber } = req.body;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    // Verificar quantidade disponível para saída
    if (type === 'saida' && product.quantity < quantity) {
      return res.status(400).json({ message: 'Quantidade insuficiente em estoque' });
    }

    // Atualizar quantidade do produto
    product.quantity += type === 'entrada' ? quantity : -quantity;
    await product.save();

    // Registrar movimentação
    const movement = new Movement({
      user,
      product: productId,
      serialNumber,
      quantity,
      type,
      ticketNumber
    });

    const newMovement = await movement.save();
    res.status(201).json(newMovement);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const movements = await Movement.find().populate('product');
    res.json(movements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 