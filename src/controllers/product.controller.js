const Product = require('../models/product.model');
const Order = require('../models/order.model');
const { sendSuccess, sendError } = require('../utils/response.util');
const { uploadToR2 } = require('../services/r2.service');

// POST /api/products: Add a new product
exports.createProduct = async (req, res) => {
  try {

    const { name, price, description, quantity, productCode, category } = req.body;
    
    let productData = { name, price, description, quantity, productCode, category };

    if (req.file) {
      const imageUrl = await uploadToR2(req.file);
      productData.imageUrl = imageUrl;
    }

    const product = new Product(productData);
    await product.save();
    return sendSuccess(res, product, 'Product created successfully', 201);
  } catch (err) {
    console.error('Create Product Error:', err);
    return sendError(res, err.message, 400);
  }
};

// GET /api/products: List all products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    return sendSuccess(res, products);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// GET /api/products/:id: Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    return sendSuccess(res, product, 'Product retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// PATCH /api/products/:id/adjust-stock: Add or subtract stock manually
exports.adjustStock = async (req, res) => {
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
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, description, productCode, category } = req.body;

    let updateData = { name, price, description, productCode, category };

    if (req.file) {
      const imageUrl = await uploadToR2(req.file);
      updateData.imageUrl = imageUrl;
    }

    // Check if productCode is being changed and if it's already in use by another product
    if (productCode) {
      const existingProduct = await Product.findOne({ productCode, _id: { $ne: id } });
      if (existingProduct) {
        return sendError(res, "ProductCode already in use by another product", 400);
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
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
exports.deleteProduct = async (req, res) => {
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

// GET /api/products/categories: Retrieve all unique product categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    // Filter out null or empty string categories
    const filteredCategories = categories.filter(c => c && c.trim() !== '');
    return sendSuccess(res, filteredCategories, 'Categories retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// GET /api/products/search: Search products by name or productCode
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return sendError(res, "Search query 'q' is required", 400);
    }

    const products = await Product.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { productCode: { $regex: q, $options: 'i' } }
      ]
    });

    return sendSuccess(res, products, 'Products retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};