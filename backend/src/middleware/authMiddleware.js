const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY || "lnbviuregalriufbcrgegrnvserghy";

exports.authenticateToken = (req, res, next) => {
  // 🔍 Debugging: See what 'req' actually is in the console
  if (!req || !req.headers) {
    console.error("❌ Critical Error: Request object is malformed or missing headers.", req);
    return res.status(500).json({ error: "Internal Server Error: Request malformed" });
  }

  // Safe access using optional chaining or logical OR
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Format: "Bearer <token>"

  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    
    req.user = user;
    next();
  });
};