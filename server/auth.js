'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET =
  process.env.STAYBOOK_JWT_SECRET || 'staybook-dev-secret-change-me';
const JWT_TTL = '7d';

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

/** Sign a compact token. Payload never carries the password hash. */
function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_TTL },
  );
}

function userFromToken(token) {
  try {
    const p = jwt.verify(token, JWT_SECRET);
    return { id: p.sub, username: p.username, name: p.name, role: p.role };
  } catch {
    return null;
  }
}

/** Populate req.user from a Bearer token if present. Never rejects. */
function attachUser(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) {
    req.user = userFromToken(token);
  }
  next();
}

/** Gate a route behind authentication. 401 when there is no valid user. */
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in required.' });
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  userFromToken,
  attachUser,
  requireAuth,
};
