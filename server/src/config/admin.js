/**
 * The store has exactly one admin account, identified by phone number and
 * authenticated by OTP only (there is no admin password login).
 *
 * Kept here rather than hardcoded at the call sites so the number lives in one
 * place and can be overridden per environment.
 */
const ADMIN_PHONE = process.env.ADMIN_PHONE || '8200198926';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'StoreOwner';

/** Is this phone number the one and only admin? */
const isAdminPhone = (phone) => String(phone || '').trim() === ADMIN_PHONE;

module.exports = { ADMIN_PHONE, ADMIN_USERNAME, isAdminPhone };
