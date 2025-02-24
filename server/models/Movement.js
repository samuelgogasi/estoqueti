const mongoose = require('mongoose');

const movementSchema = new mongoose.Schema({
  user: { type: String, required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  serialNumber: { type: String, required: true },
  quantity: { type: Number, required: true },
  type: { type: String, enum: ['entrada', 'saida'], required: true },
  ticketNumber: { type: String },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Movement', movementSchema); 