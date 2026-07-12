const sendResponse = require('../utils/response');

const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    
    // Replace req parameters with parsed typed values
    req.body = parsed.body || req.body;
    req.query = parsed.query || req.query;
    req.params = parsed.params || req.params;
    
    next();
  } catch (error) {
    const errorDetails = error.errors.map(err => ({
      field: err.path.join('.').replace(/^(body|query|params)\./, ''),
      message: err.message
    }));
    
    return sendResponse(res, 400, {
      success: false,
      message: 'Validation failed',
      errors: errorDetails
    });
  }
};

module.exports = validate;
