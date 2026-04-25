const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  quantity: { type: Number, required: true, default: 0 },
  salecode: { type: String, unique: true, required: true },
  category: { type: String }
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
