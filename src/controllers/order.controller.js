const Order = require('../models/order.model');
const Product = require('../models/product.model');
const { sendSuccess, sendError } = require('../utils/response.util');

// GET /api/order/:salecode: Find product by salecode and check stock
exports.checkOrder = async (req, res) => {
  try {
    const { salecode } = req.params;
    const product = await Product.findOne({ salecode });

    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    if (product.quantity <= 0) {
      return sendSuccess(res, { message: 'Out of stock', product }, 'Item is currently unavailable');
    }

    return sendSuccess(res, { message: 'In stock', product }, 'Item is available');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// POST /api/check-message: Classify if message is a salecode or general text
exports.classifyMessage = async (req, res) => {
  try {
    const { conversation } = req.body;

    if (!conversation) {
      return sendError(res, 'Conversation body is required', 400);
    }

    const salecodeRegex = /^[A-Z]\d{3}$/i;
    const isSalecode = salecodeRegex.test(conversation.trim());

    if (isSalecode) {
      return sendSuccess(res, {
        type: 'salecode',
        content: conversation.trim().toUpperCase()
      }, 'This is a valid salecode format.');
    } else {
      return sendSuccess(res, {
        type: 'message',
        content: conversation
      }, 'This is a general message.');
    }
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// POST /api/order/checkout: Deduct stock and create an order
exports.checkout = async (req, res) => {
  try {
    const { username, salecode: input } = req.body;

    if (!username || !input || typeof username !== 'string' || typeof input !== 'string') {
      return sendError(res, "Invalid input data: username and salecode are required strings", 400);
    }

    // Extract productCode and quantity
    const parts = input.split('=');
    const productCode = parts[0].trim();
    const quantity = parts[1] ? parseInt(parts[1], 10) : 1;

    if (!productCode || isNaN(quantity) || quantity <= 0) {
      return sendError(res, "Invalid salecode format. Expected 'CODE' or 'CODE=QUANTITY'", 400);
    }

    // Search product in MongoDB
    const product = await Product.findOne({ salecode: productCode });

    // If not found
    if (!product) {
      return sendError(res, "Product not found", 404);
    }

    // If stock is low
    if (product.quantity < quantity) {
      return sendError(res, "Insufficient stock", 400);
    }

    // Update stock
    const totalPrice = product.price * quantity;
    product.quantity -= quantity;
    await product.save();

    // Save the Order
    const newOrder = new Order({
      username,
      product: product._id,
      salecode: productCode,
      quantity,
      totalPrice,
      status: 'pending'
    });
    
    await newOrder.save();

    return sendSuccess(res, newOrder, "Order success", 201);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// GET /api/orders: List all orders with optional username filter
exports.getOrders = async (req, res) => {
  try {
    const { username } = req.query;
    let query = {};

    if (username) {
      query.username = username;
    }

    const orders = await Order.find(query)
      .populate('product')
      .sort({ createdAt: -1 });

    return sendSuccess(res, orders, "Orders retrieved successfully");
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};
