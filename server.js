import "dotenv/config"; // 🔥 MUST BE FIRST

import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import { verifyEmailTransporter } from "./src/config/email.js";

const startServer = async () => {
  try {
    // 1️⃣ Connect DB
    await connectDB();

    // 2️⃣ Verify email service BEFORE server starts
    await verifyEmailTransporter();

    // 3️⃣ Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1); // 🔥 crash on fatal config error
  }
  console.log("CLIENT_URL from backend =", process.env.CLIENT_URL);

};

startServer();
