import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== "string")
    return res.status(401).json({ message: "Authorization token required" });

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer")
    return res.status(401).json({ message: "Invalid authorization format" });

  const token = parts[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret)
      return res.status(500).json({ message: "Server configuration error" });

    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default authMiddleware;
