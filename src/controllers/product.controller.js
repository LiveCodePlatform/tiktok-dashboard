const Product = require('../models/product.model');
const Order = require('../models/order.model');
const { sendSuccess, sendError } = require('../utils/response.util');
const { uploadToR2 } = require('../services/r2.service');
const { processExcelImport } = require('../services/excel.service');

// POST /api/products: Add a new product
exports.createProduct = async (req, res) => {
  try {

    const { name, price, description, quantity, productCode, category, sellingMethod, crossSellCategory } = req.body;
    
    let productData = { name, price, description, quantity, productCode, category, sellingMethod, crossSellCategory };

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
    const { category } = req.query;
    let query = {};
    if (category) {
      query.category = category;
    }
    const products = await Product.find(query);
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
    const { name, price, description, productCode, category, sellingMethod, crossSellCategory } = req.body;

    let updateData = { name, price, description, productCode, category, sellingMethod, crossSellCategory };

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
    const ordersCount = await Order.countDocuments({ 'items.product': id });
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

// POST /api/products/bulk-delete: Remove multiple products
exports.bulkDeleteProducts = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return sendError(res, 'Please provide an array of product IDs to delete', 400);
    }

    // Check which products are referenced in orders
    const ordersWithProducts = await Order.find({ 'items.product': { $in: ids } }).select('items.product');
    const blockedIds = new Set();
    ordersWithProducts.forEach(order => {
      if (Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (item.product && ids.includes(item.product.toString())) {
            blockedIds.add(item.product.toString());
          }
        });
      }
    });

    const deletableIds = ids.filter(id => !blockedIds.has(id.toString()));

    if (deletableIds.length === 0) {
      return sendError(
        res,
        `Cannot delete selected products. All ${ids.length} product(s) have associated orders.`,
        400
      );
    }

    const deleteResult = await Product.deleteMany({ _id: { $in: deletableIds } });

    return sendSuccess(res, {
      deletedCount: deleteResult.deletedCount,
      blockedCount: blockedIds.size,
      deletedIds: deletableIds,
      blockedIds: Array.from(blockedIds)
    }, `Successfully deleted ${deleteResult.deletedCount} product(s)${blockedIds.size > 0 ? `. ${blockedIds.size} product(s) could not be deleted due to associated orders.` : ''}`);
  } catch (err) {
    console.error('Bulk Delete Error:', err);
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

// POST /api/products/import-excel: Bulk import products from Excel (.xlsx, .xls, .csv)
exports.importProductsFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'Please upload an Excel or CSV file (field name: "file")', 400);
    }

    const mode = req.query.mode || req.body.mode || 'upsert';
    const result = await processExcelImport(req.file.buffer, { mode });

    const message = `Excel import processed: ${result.createdCount} created, ${result.updatedCount} updated, ${result.failedCount} failed`;
    return sendSuccess(res, result, message, 200);
  } catch (err) {
    console.error('Excel Import Error:', err);
    return sendError(res, err.message, err.statusCode || 500);
  }
};
