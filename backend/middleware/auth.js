const jwt = require('jsonwebtoken');
const secret = 'jwt_secret';

module.exports = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const user = jwt.verify(token.split(' ')[1], secret);
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
