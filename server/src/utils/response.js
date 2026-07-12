/**
 * Standard API Response Format Helper
 */
const sendResponse = (res, statusCode, { success = true, message = '', data = null, pagination = null, meta = null, errors = null }) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
    pagination,
    meta,
    errors
  });
};

module.exports = sendResponse;
