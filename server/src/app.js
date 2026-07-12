const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./config/logger');
const { nosqlInjectionProtection, xssProtection } = require('./middlewares/security');
const errorHandler = require('./middlewares/error');

const app = express();

// Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: false // Allow loading local uploads directly
}));

// Enable CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Parsing body and urlencoded requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Http Request Logger Middleware
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.originalUrl}`);
  next();
});

// Custom Sanitization middlewares
app.use(nosqlInjectionProtection);
app.use(xssProtection);

// Rate Limiter configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Strict rate limiters for OTP and authentication endpoints
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 OTP requests per 15 minutes
  message: { success: false, message: 'Too many OTP requests. Please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 verification attempts per 15 minutes
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/v1/auth/otp/send', otpSendLimiter);
app.use('/api/v1/auth/otp/verify', authVerifyLimiter);
app.use('/api/v1/admin/login/otp', authVerifyLimiter);
app.use('/api/v1/admin/login', authVerifyLimiter);

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Main API Router Mount
app.use('/api/v1', require('./routes'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
