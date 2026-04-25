/**
 * Sends a standard success response
 * @param {Object} res - Express response object
 * @param {any} data - Data to send in the response
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
const sendSuccess = (res, data, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Sends a standard error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {any} error - Detailed error information
 */
const sendError = (res, message = "Error", statusCode = 500, error = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error
  });
};

module.exports = {
  sendSuccess,
  sendError
};
