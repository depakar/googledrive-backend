import express from "express";
import protect from "../middleware/auth.middleware.js";
import upload from "../utils/multer.js";
import {
  uploadFile,
  listFiles,
  downloadFile,
  deleteFile,
} from "../controllers/file.controller.js";



const router = express.Router();

router.post("/upload", protect, upload.single("file"), uploadFile);
router.get("/", protect, listFiles);
router.get("/download/:id", protect, downloadFile);
router.delete("/:id", protect, deleteFile);


export default router;
