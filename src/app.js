import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import folderRoutes from "./routes/folder.routes.js";
import fileRoutes from "./routes/file.routes.js";

const app = express();

// ✅ REQUIRED: Proper body parsers for Render
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ✅ CORS (frontend + Postman friendly)
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/files", fileRoutes);

export default app;
