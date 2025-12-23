const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  // 1. Get token from header
  const token = req.header('Authorization')?.split(' ')[1]; // Format: "Bearer TOKEN"

  // 2. Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // 3. Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 4. Add user from payload to request object
    req.user = decoded; 
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

module.exports = auth;