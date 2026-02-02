const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  // Bearer <token>
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access Denied: No Token Provided" });
  }

  try {
    const verified = jwt.verify(token, process.env.SECRET_KEY);
    req.user = verified; // { userId: 1, role: 'TEACHER' }
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid Token" });
  }
};

module.exports = { authenticateToken };