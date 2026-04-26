import Product from '../models/product.model.js';
import Order from '../models/order.model.js';
import { sendSuccess, sendError } from '../shared/response.js';

// POST /api/products: Add a new product
export const createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    return sendSuccess(res, product, 'Product created successfully', 201);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// GET /api/products: List all products
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    return sendSuccess(res, products);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// GET /api/order/:salecode: Find product by salecode and check stock
export const checkOrder = async (req, res) => {
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
export const classifyMessage = async (req, res) => {
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
export const checkout = async (req, res) => {
  try {
    const { username, salecode: input } = req.body;

    console.log('🚀 Checkout attempt:', { username, input });

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

    console.log('📦 Processing order for:', { productCode, quantity });

    // Search product in MongoDB
    const product = await Product.findOne({ salecode: productCode });

    // If not found
    if (!product) {
      console.log('❌ Product not found:', productCode);
      return sendError(res, "Product not found", 404);
    }

    // If stock is low
    if (product.quantity < quantity) {
      console.log('⚠️ Insufficient stock:', { available: product.quantity, requested: quantity });
      return sendError(res, "Insufficient stock", 400);
    }

    // Update stock
    const totalPrice = product.price * quantity;
    product.quantity -= quantity;
    
    console.log('📝 Updating product stock...');
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
    
    console.log('💾 Saving new order...');
    await newOrder.save();

    console.log('✅ Order completed successfully:', newOrder._id);
    return sendSuccess(res, newOrder, "Order success", 201);
  } catch (err) {
    console.error('❌ Checkout error:', err);
    return sendError(res, err.message, 500);
  }
};

// GET /api/orders: List all orders with optional username filter
export const getOrders = async (req, res) => {
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

// PATCH /api/products/:id/adjust-stock: Add or subtract stock manually
export const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustmentValue } = req.body;

    if (typeof adjustmentValue !== 'number') {
      return sendError(res, "Adjustment value must be a number", 400);
    }

    const product = await Product.findById(id);

    if (!product) {
      return sendError(res, "Product not found", 404);
    }

    const newQuantity = product.quantity + adjustmentValue;

    if (newQuantity < 0) {
      return sendError(res, "Stock cannot be negative", 400);
    }

    product.quantity = newQuantity;
    await product.save();

    return sendSuccess(res, product, "Stock updated successfully");
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// PATCH /api/products/:id: Update product details
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, description, salecode, category } = req.body;

    // Check if salecode is being changed and if it's already in use by another product
    if (salecode) {
      const existingProduct = await Product.findOne({ salecode, _id: { $ne: id } });
      if (existingProduct) {
        return sendError(res, "Salecode already in use by another product", 400);
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { name, price, description, salecode, category },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return sendError(res, "Product not found", 404);
    }

    return sendSuccess(res, updatedProduct, 'Product updated successfully');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// DELETE /api/products/:id: Remove a product
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if there are any existing Orders associated with this product
    const ordersCount = await Order.countDocuments({ product: id });
    if (ordersCount > 0) {
      return sendError(res, `Cannot delete product. It has ${ordersCount} associated orders.`, 400);
    }

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return sendError(res, "Product not found", 404);
    }

    return sendSuccess(res, null, 'Product deleted successfully');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};
