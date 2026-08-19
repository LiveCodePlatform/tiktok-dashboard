const multer = require('multer');
const path = require('path');
const AppError = require('../errors/AppError');

// In-memory storage for uploaded files
const storage = multer.memoryStorage();

// Allowed MIME types and file extensions for spreadsheets
const allowedExtensions = ['.xlsx', '.xls', '.csv'];
const allowedMimeTypes = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv', // .csv
  'application/csv',
  'text/plain',
  'application/octet-stream' // fallback sometimes sent by clients for xlsx
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    return cb(
      new AppError(
        `Invalid file type (${ext}). Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.`,
        400
      ),
      false
    );
  }

  // Double check MIME type if available
  if (file.mimetype && !allowedMimeTypes.includes(file.mimetype) && !file.mimetype.includes('excel') && !file.mimetype.includes('spreadsheet')) {
    return cb(
      new AppError(
        `Invalid file format. Please upload a valid Excel or CSV spreadsheet.`,
        400
      ),
      false
    );
  }

  cb(null, true);
};

const excelUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

module.exports = excelUpload;
