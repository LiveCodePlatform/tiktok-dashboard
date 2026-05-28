const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productCode: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  subtotal: {
    type: Number,
    required: true
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  items: {
    type: [orderItemSchema],
    required: true,
    validate: {
      validator: function (v) {
        return v.length > 0;
      },
      message: 'Order must have at least one item'
    }
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cash-on-delivery', 'bank-transfer', 'kpay', 'wavepay'],
    default: 'cash-on-delivery'
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
