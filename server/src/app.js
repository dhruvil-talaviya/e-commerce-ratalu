const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./config/logger');
const { nosqlInjectionProtection, xssProtection } = require('./middlewares/security');
const errorHandler = require('./middlewares/error');

const app = express();

app.set('trust proxy', 1);

// Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: false // Allow loading local uploads directly
}));

// Enable CORS with credentials support
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, postman) or matching origin
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev/staging
  },
  credentials: true
}));

app.use(cookieParser());

// Parsing body and urlencoded requests
// Stash the raw body so payment-gateway webhooks can verify their HMAC
// signature against the exact bytes we received.
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => { req.rawBody = buf; }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Http Request Logger Middleware
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.originalUrl}`);
  next();
});

// Custom Sanitization middlewares
app.use(nosqlInjectionProtection);
app.use(xssProtection);

/* ─── Rate limiting ─────────────────────────────────────────────────────────
 *
 * Tiered on purpose. A single global bucket has to be set low enough to stop
 * abuse, which makes it far too low for a legitimate admin console (which polls
 * dashboards, notifications and order queues). The previous 200-per-15-minutes
 * limit was exhausted by the dashboard's own polling in about five minutes.
 *
 * So: reads are generous, writes are moderate, and auth stays strict — because
 * the thing actually worth throttling is credential guessing, not page loads.
 */

/** Errors are JSON, matching the API envelope, so the client can show them. */
const limitMessage = (message) => ({ success: false, message, data: null });

/**
 * Who is this request from?
 *
 * The storefront proxies every /api/v1 call through Next.js, so as far as
 * Express is concerned they ALL arrive from one address — the Next server's.
 * Keying purely on IP therefore puts every signed-in user in a single shared
 * bucket, and one busy admin console 429s the entire site. (That is exactly
 * what happened.)
 *
 * So: key on the user id from the bearer token when there is one, and fall back
 * to the IP for anonymous traffic. Each account gets its own budget, and
 * unauthenticated abuse is still limited per address.
 */
const jwt = require('jsonwebtoken');

const rateKey = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      if (decoded?.id) return `user:${decoded.id}`;
    } catch {
      // Expired/forged token — fall through and limit by address.
    }
  }
  return `ip:${req.ip}`;
};

const isAdminRequest = (req) => {
  if (req.path.includes('/admin/login')) return false;
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      if (decoded?.role === 'Admin' || decoded?.role === 'Super Admin') return true;
    } catch {
      // Fall through
    }
  }
  return req.path.includes('/admin');
};

// Reads: a busy console bursts on load; a scraper still can't hammer us.
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2000,
  keyGenerator: rateKey,
  message: limitMessage('Too many requests. Please slow down and try again shortly.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS' || process.env.NODE_ENV === 'development' || isAdminRequest(req)
});

// Writes: placing orders, refunds, content changes. Real users do this rarely.
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  keyGenerator: rateKey,
  message: limitMessage('Too many changes in a short time. Please wait a moment.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' || req.method === 'OPTIONS' || process.env.NODE_ENV === 'development' || isAdminRequest(req)
});

app.use('/api', readLimiter);
app.use('/api', writeLimiter);

// ─── Strict limits on the endpoints that actually get attacked ──────────────
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Max 5 OTP requests per 15 minutes
  message: limitMessage('Too many OTP requests. Please try again after 15 minutes.'),
  standardHeaders: true,
  legacyHeaders: false,
});

const authVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Max 10 verification attempts per 15 minutes
  message: limitMessage('Too many login attempts. Please try again after 15 minutes.'),
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
app.use('/api/user', require('./routes/user.routes'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
