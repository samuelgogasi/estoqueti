const router = require('express').Router();
const Product = require('../models/Product');

// Buscar todos os produtos
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Adicionar produto
router.post('/', async (req, res) => {
  const product = new Product({
    name: req.body.name,
    category: req.body.category,
    brand: req.body.brand,
    serialNumber: req.body.serialNumber,
    quantity: req.body.quantity
  });

  try {
    const newProduct = await product.save();
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Adicione outras rotas (PUT, DELETE) conforme necessário

module.exports = router; 