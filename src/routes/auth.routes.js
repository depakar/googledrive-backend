import express from "express";
import {
  registerUser,
  verifyAccount,
  loginUser,
  forgotPassword,
  resetPassword 
  
} from "../controllers/auth.controller.js";


const router = express.Router();

router.post("/register", registerUser);
router.get("/verify/:token", verifyAccount);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);



export default router;
