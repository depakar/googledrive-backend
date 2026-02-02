import express from "express";
import {
  createFolder,
  getFolders,
} from "../controllers/folder.controller.js";
import protect from "../middleware/auth.middleware.js";
import { deleteFolder } from "../controllers/folder.controller.js";


const router = express.Router();

router.post("/", protect, createFolder);
router.get("/", protect, getFolders);
router.delete("/:folderId", protect, deleteFolder);


export default router;
