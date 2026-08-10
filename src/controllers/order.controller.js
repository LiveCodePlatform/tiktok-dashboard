const Order = require('../models/order.model');
const Product = require('../models/product.model');
const { sendSuccess, sendError } = require('../utils/response.util');

// GET /api/order/:productCode: Find product by productCode and check stock
exports.checkOrder = async (req, res) => {
  try {
    const { productCode } = req.params;
    const product = await Product.findOne({ productCode });

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

    const productCodeRegex = /^[A-Z]\d{3}$/i;
    const isProductCode = productCodeRegex.test(conversation.trim());

    if (isProductCode) {
      return sendSuccess(res, {
        type: 'productCode',
        content: conversation.trim().toUpperCase()
      }, 'This is a valid productCode format.');
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

// POST /api/orders: Create a multi-product order
exports.createOrder = async (req, res) => {
  try {
    const { products, name, phone, address, paymentMethod } = req.body;

    // Validate required fields
    if (!name || !phone || !address || !paymentMethod) {
      return sendError(res, 'name, phone, address, and paymentMethod are required', 400);
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      return sendError(res, 'products array is required and must not be empty', 400);
    }

    // Validate each product entry
    for (const item of products) {
      if (!item.productCode || !item.quantity) {
        return sendError(res, 'Each product must have productCode and quantity', 400);
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return sendError(res, 'Quantity must be a positive number', 400);
      }
    }

    // Build order items and calculate totals
    const orderItems = [];
    let totalAmount = 0;

    for (const item of products) {
      const product = await Product.findOne({ productCode: item.productCode });

      if (!product) {
        return sendError(res, `Product not found with code: ${item.productCode}`, 404);
      }

      if (product.quantity < item.quantity) {
        return sendError(res, `Insufficient stock for "${product.name}". Available: ${product.quantity}, requested: ${item.quantity}`, 400);
      }

      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;

      orderItems.push({
        product: product._id,
        productCode: product.productCode,
        quantity: item.quantity,
        price: product.price,
        subtotal
      });
    }

    // Deduct stock for each product
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      product.quantity -= item.quantity;
      await product.save();
    }

    // Create and save the order
    const newOrder = new Order({
      items: orderItems,
      name,
      phone,
      address,
      paymentMethod,
      totalAmount,
      status: 'pending'
    });

    await newOrder.save();

    return sendSuccess(res, newOrder, 'Order created successfully', 201);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// GET /api/orders: List all orders with optional filters
exports.getOrders = async (req, res) => {
  try {
    const { name, status } = req.query;
    let query = {};

    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('items.product')
      .sort({ createdAt: -1 });

    return sendSuccess(res, orders, 'Orders retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};
