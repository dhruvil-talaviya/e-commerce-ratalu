const jwt = require('jsonwebtoken');

const generateAccessToken = (userOrId, roleParam) => {
  const id = typeof userOrId === 'object' && userOrId !== null ? userOrId._id || userOrId.id : userOrId;
  const role = roleParam || (typeof userOrId === 'object' && userOrId !== null ? userOrId.role : 'customer') || 'customer';
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30m' }
  );
};

const generateRefreshToken = (userOrId, roleParam) => {
  const id = typeof userOrId === 'object' && userOrId !== null ? userOrId._id || userOrId.id : userOrId;
  const role = roleParam || (typeof userOrId === 'object' && userOrId !== null ? userOrId.role : 'customer') || 'customer';
  return jwt.sign(
    { id, role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

const setRefreshTokenCookie = (res, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

const clearRefreshTokenCookie = (res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/'
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie
};

