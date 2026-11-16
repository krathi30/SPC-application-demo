const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Session store (in-memory — cleared on server restart, which is fine for on-premise)
// Sessions are keyed by token, value is { role, username, createdAt }
const sessions = new Map();
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours (full shift)

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  if (stored.startsWith('$2')) {
    return bcrypt.compareSync(password, stored);
  }
  const [, salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
  const expected = Buffer.from(hash, 'hex');
  return expected.length === verify.length && crypto.timingSafeEqual(expected, verify);
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// Clean expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (now - session.createdAt > SESSION_TIMEOUT_MS) {
      sessions.delete(token);
    }
  }
}, 60 * 60 * 1000).unref(); // Cleanup every hour

// Create a session and return the token
function createSession(role, username) {
  const token = generateToken();
  sessions.set(token, { role, username, createdAt: Date.now() });
  return token;
}

// Get session from request cookie
function getSession(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/spc_session=([a-f0-9]+)/);
  if (!match) return null;

  const token = match[1];
  const session = sessions.get(token);
  if (!session) return null;

  // Check expiry
  if (Date.now() - session.createdAt > SESSION_TIMEOUT_MS) {
    sessions.delete(token);
    return null;
  }

  return session;
}

// Middleware: require admin (admin OR master)
function requireAdmin(req, res, next) {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (session.role !== 'admin' && session.role !== 'master') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  req.session = session;
  next();
}

// Middleware: require master only
function requireMaster(req, res, next) {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (session.role !== 'master') {
    return res.status(403).json({ error: 'Master owner access required' });
  }
  req.session = session;
  next();
}

// Middleware: optional auth (attaches session if present, doesn't block)
function optionalAuth(req, res, next) {
  req.session = getSession(req);
  next();
}

// Cookies get the Secure flag whenever the request reached us over HTTPS
// (directly or via a trusted proxy / load balancer), or when COOKIE_SECURE=true.
function cookieFlags(req) {
  const secure = process.env.COOKIE_SECURE === 'true' || Boolean(req && req.secure);
  return `HttpOnly; SameSite=Strict; Path=/${secure ? '; Secure' : ''}`;
}

// Set session cookie on response
function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `spc_session=${token}; ${cookieFlags(res.req)}; Max-Age=${SESSION_TIMEOUT_MS / 1000}`);
}

// Clear session cookie
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `spc_session=; ${cookieFlags(res.req)}; Max-Age=0`);
}

// Invalidate sessions after a credential change, e.g. all admin sessions when the
// shared admin password changes, or one master's sessions when their account changes.
function destroySessionsWhere(predicate) {
  for (const [token, session] of sessions) {
    if (predicate(session)) sessions.delete(token);
  }
}

// ------------------------------------------------------------
// Login throttling: after LOGIN_MAX_FAILURES failed attempts from one client IP
// within LOGIN_WINDOW_MS, further attempts are refused until the window passes.
// ------------------------------------------------------------
const LOGIN_MAX_FAILURES = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginFailures = new Map(); // ip -> { count, firstAt }

function loginKey(req) {
  return req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function loginThrottle(req, res, next) {
  const entry = loginFailures.get(loginKey(req));
  if (entry && Date.now() - entry.firstAt < LOGIN_WINDOW_MS && entry.count >= LOGIN_MAX_FAILURES) {
    const retryAfter = Math.ceil((entry.firstAt + LOGIN_WINDOW_MS - Date.now()) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Too many failed login attempts. Try again later.' });
  }
  next();
}

function recordLoginFailure(req) {
  const key = loginKey(req);
  const now = Date.now();
  const entry = loginFailures.get(key);
  if (!entry || now - entry.firstAt >= LOGIN_WINDOW_MS) {
    loginFailures.set(key, { count: 1, firstAt: now });
  } else {
    entry.count += 1;
  }
}

function clearLoginFailures(req) {
  loginFailures.delete(loginKey(req));
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginFailures) {
    if (now - entry.firstAt >= LOGIN_WINDOW_MS) loginFailures.delete(key);
  }
}, LOGIN_WINDOW_MS).unref();

// Destroy session by request
function destroySession(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/spc_session=([a-f0-9]+)/);
  if (match) {
    sessions.delete(match[1]);
  }
}

module.exports = {
  createSession,
  getSession,
  requireAdmin,
  requireMaster,
  optionalAuth,
  setSessionCookie,
  clearSessionCookie,
  destroySession,
  destroySessionsWhere,
  loginThrottle,
  recordLoginFailure,
  clearLoginFailures,
  verifyPassword,
  hashPassword,
};
