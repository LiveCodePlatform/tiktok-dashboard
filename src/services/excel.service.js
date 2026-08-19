const xlsx = require('xlsx');
const Product = require('../models/product.model');
const AppError = require('../errors/AppError');

/**
 * Normalizes keys of a raw row object to standard schema fields
 * @param {Object} rawRow
 * @returns {Object} Normalized row
 */
const normalizeRowKeys = (rawRow) => {
  const normalized = {};

  for (const [key, value] of Object.entries(rawRow)) {
    const cleanKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '');

    if (['name', 'productname', 'itemname', 'item', 'title'].includes(cleanKey)) {
      normalized.name = typeof value === 'string' ? value.trim() : String(value).trim();
    } else if (['price', 'unitprice', 'cost', 'amount'].includes(cleanKey)) {
      normalized.price = value;
    } else if (['quantity', 'qty', 'stock', 'stockquantity', 'inventory'].includes(cleanKey)) {
      normalized.quantity = value;
    } else if (['productcode', 'code', 'itemcode', 'sku', 'salecode'].includes(cleanKey)) {
      normalized.productCode = typeof value === 'string' ? value.trim().toUpperCase() : String(value).trim().toUpperCase();
    } else if (['category', 'categoryname', 'cat', 'type'].includes(cleanKey)) {
      normalized.category = typeof value === 'string' ? value.trim() : String(value).trim();
    } else if (['description', 'desc', 'details'].includes(cleanKey)) {
      normalized.description = typeof value === 'string' ? value.trim() : String(value).trim();
    } else if (['imageurl', 'image', 'photo', 'img', 'picture'].includes(cleanKey)) {
      normalized.imageUrl = typeof value === 'string' ? value.trim() : String(value).trim();
    }
  }

  return normalized;
};

/**
 * Parses numeric values safely (handles commas, currency symbols, and numbers)
 * @param {any} val 
 * @returns {number|NaN}
 */
const parseNumber = (val) => {
  if (val === undefined || val === null || val === '') return NaN;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // Strip commas and whitespace
    const cleanStr = val.replace(/,/g, '').trim();
    const num = Number(cleanStr);
    return isNaN(num) ? NaN : num;
  }
  return NaN;
};

/**
 * Process Excel file buffer and perform bulk upsert / insert
 * @param {Buffer} fileBuffer 
 * @param {Object} options - { mode: 'upsert' | 'insert_only' }
 * @returns {Promise<Object>} Import summary result
 */
const processExcelImport = async (fileBuffer, options = { mode: 'upsert' }) => {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new AppError('The uploaded file is empty.', 400);
  }

  let workbook;
  try {
    workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
  } catch (err) {
    throw new AppError('Failed to parse spreadsheet file. Please check file format.', 400);
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new AppError('The Excel file contains no worksheets.', 400);
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new AppError('The uploaded worksheet contains no data rows.', 400);
  }

  const totalRows = rawRows.length;
  const validRows = [];
  const errors = [];
  const seenCodesInFile = new Set();

  // Validate each row
  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 2; // Excel row number (1-based + 1 for header)
    const normalized = normalizeRowKeys(rawRow);

    // 1. Validate Product Code
    if (!normalized.productCode) {
      errors.push({
        row: rowNumber,
        productCode: 'N/A',
        error: 'Product Code is required.'
      });
      return;
    }

    if (seenCodesInFile.has(normalized.productCode)) {
      errors.push({
        row: rowNumber,
        productCode: normalized.productCode,
        error: `Duplicate Product Code "${normalized.productCode}" within the Excel file.`
      });
      return;
    }
    seenCodesInFile.add(normalized.productCode);

    // 2. Validate Product Name
    if (!normalized.name) {
      errors.push({
        row: rowNumber,
        productCode: normalized.productCode,
        error: 'Product Name is required.'
      });
      return;
    }

    // 3. Validate Price
    const priceNum = parseNumber(normalized.price);
    if (isNaN(priceNum) || priceNum < 0) {
      errors.push({
        row: rowNumber,
        productCode: normalized.productCode,
        error: 'Price must be a valid non-negative number.'
      });
      return;
    }
    normalized.price = priceNum;

    // 4. Validate Quantity
    let qtyNum = 0;
    if (normalized.quantity !== undefined && normalized.quantity !== '') {
      qtyNum = parseNumber(normalized.quantity);
      if (isNaN(qtyNum) || qtyNum < 0) {
        errors.push({
          row: rowNumber,
          productCode: normalized.productCode,
          error: 'Quantity must be a valid non-negative number.'
        });
        return;
      }
    }
    normalized.quantity = qtyNum;

    validRows.push({
      rowNumber,
      data: normalized
    });
  });

  if (validRows.length === 0) {
    return {
      totalRows,
      successCount: 0,
      createdCount: 0,
      updatedCount: 0,
      failedCount: errors.length,
      errors
    };
  }

  const mode = options.mode || 'upsert';
  let createdCount = 0;
  let updatedCount = 0;

  if (mode === 'insert_only') {
    // Find all codes that already exist in DB
    const validCodes = validRows.map(r => r.data.productCode);
    const existingProducts = await Product.find({ productCode: { $in: validCodes } }).select('productCode');
    const existingCodeSet = new Set(existingProducts.map(p => p.productCode));

    const rowsToInsert = [];

    validRows.forEach(r => {
      if (existingCodeSet.has(r.data.productCode)) {
        errors.push({
          row: r.rowNumber,
          productCode: r.data.productCode,
          error: `Product Code "${r.data.productCode}" already exists in database.`
        });
      } else {
        rowsToInsert.push(r.data);
      }
    });

    if (rowsToInsert.length > 0) {
      const inserted = await Product.insertMany(rowsToInsert, { ordered: false });
      createdCount = inserted.length;
    }
  } else {
    // Upsert mode: use bulkWrite for high performance
    const validCodes = validRows.map(r => r.data.productCode);
    const existingProducts = await Product.find({ productCode: { $in: validCodes } }).select('productCode');
    const existingCodeSet = new Set(existingProducts.map(p => p.productCode));

    const bulkOps = validRows.map(r => {
      const isExisting = existingCodeSet.has(r.data.productCode);
      if (isExisting) {
        updatedCount++;
      } else {
        createdCount++;
      }

      return {
        updateOne: {
          filter: { productCode: r.data.productCode },
          update: { $set: r.data },
          upsert: true
        }
      };
    });

    if (bulkOps.length > 0) {
      await Product.bulkWrite(bulkOps);
    }
  }

  return {
    totalRows,
    successCount: createdCount + updatedCount,
    createdCount,
    updatedCount,
    failedCount: errors.length,
    errors
  };
};

module.exports = {
  processExcelImport,
  normalizeRowKeys,
  parseNumber
};
