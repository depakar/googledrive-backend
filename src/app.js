import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import folderRoutes from "./routes/folder.routes.js";
import fileRoutes from "./routes/file.routes.js";

const app = express();

/* ===============================
   BODY PARSERS
================================ */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ===============================
   CORS CONFIG (IMPORTANT FIX)
================================ */
const allowedOrigins = [
  process.env.CLIENT_URL, // Netlify frontend
  "http://localhost:5173", // local dev (Vite)
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


/* ===============================
   ROUTES
================================ */
app.use("/api/auth", authRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/files", fileRoutes);

/* ===============================
   HEALTH CHECK (OPTIONAL BUT NICE)
================================ */
app.get("/", (req, res) => {
  res.send("🚀 Backend is running");
});

export default app;
