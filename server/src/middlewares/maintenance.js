const jwt = require('jsonwebtoken');
const Settings = require('../models/Settings');

/**
 * Maintenance mode gate.
 *
 * When the admin flips `maintenanceMode` on, the storefront API returns 503 and
 * the client renders the maintenance screen. Three things must keep working, or
 * the switch becomes a one-way door:
 *
 *   1. /admin/*   — so the admin can turn it back off, and because the public
 *                   GET /admin/settings is what the storefront reads to learn
 *                   it is in maintenance and render the screen
 *   2. /auth/*    — so the admin can sign in to reach the toggle
 *
 * An authenticated admin also bypasses the gate everywhere, so the store can be
 * checked over before reopening.
 */

// The flag is read on nearly every request, so cache it briefly rather than
// hitting Mongo each time. Short enough that toggling feels immediate.
const CACHE_MS = 5000;
let cached = { value: null, at: 0 };

const readSettings = async () => {
  const now = Date.now();
  if (cached.value && now - cached.at < CACHE_MS) return cached.value;

  const settings = await Settings.findOne().lean();
  cached = { value: settings || {}, at: now };
  return cached.value;
};

/** Drop the cache so an admin toggle takes effect on the very next request. */
const invalidateCache = () => {
  cached = { value: null, at: 0 };
};

/** Paths that must stay reachable while the store is down. */
const isAlwaysAllowed = (path) => {
  if (path.startsWith('/admin')) return true;
  if (path.startsWith('/auth')) return true;
  return false;
};

/** True if the caller holds a valid non-customer (admin) token. */
const isAdminRequest = (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return false;
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    return String(decoded.role || '').toLowerCase() !== 'customer';
  } catch {
    return false;
  }
};

const maintenanceGuard = async (req, res, next) => {
  try {
    if (isAlwaysAllowed(req.path)) return next();

    const settings = await readSettings();
    if (!settings.maintenanceMode) return next();

    if (isAdminRequest(req)) return next();

    return res.status(503).json({
      success: false,
      message: settings.maintenanceMessage || 'The store is temporarily unavailable.',
      data: null,
      errors: null,
      maintenance: {
        active: true,
        title: settings.maintenanceTitle || "We'll be right back",
        message: settings.maintenanceMessage || '',
        endsAt: settings.maintenanceEndsAt || null
      }
    });
  } catch (error) {
    // Never let a settings lookup failure take the store down.
    next();
  }
};

module.exports = { maintenanceGuard, invalidateCache };
