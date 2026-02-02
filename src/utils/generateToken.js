import jwt from "jsonwebtoken";

export const generateActivationToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};
