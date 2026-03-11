const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }
}

module.exports = { authenticateToken };
