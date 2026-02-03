import "dotenv/config"; // MUST be first

import app from "./src/app.js";
import connectDB from "./src/config/db.js";

const startServer = async () => {
  try {
    // 1️⃣ Connect MongoDB
    await connectDB();

    // 2️⃣ Start server FIRST (Render requirement)
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    console.log("CLIENT_URL from backend =", process.env.CLIENT_URL);
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
