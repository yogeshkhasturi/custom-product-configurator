require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const productRoutes = require("./routes/productRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const fixImagesRoute = require("./routes/fixImagesRoute");

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV?.trim().toLowerCase() === "production";

// --------------------------------------------------
// Next.js configuration (Production only)
// --------------------------------------------------
let nextApp = null;
let nextHandle = null;

if (isProduction) {
  let next;
  try {
    next = require("next");
  } catch (err) {
    try {
      next = require(path.join(__dirname, "../client/node_modules/next"));
    } catch (e) {
      console.error("Failed to load Next.js module:", e.message);
      process.exit(1);
    }
  }

  nextApp = next({
    dev: false,
    dir: path.join(__dirname, "../client"),
  });

  nextHandle = nextApp.getRequestHandler();
}

// --------------------------------------------------
// Middleware
// --------------------------------------------------
const allowedOrigins = [
  process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, "") : null,
  process.env.SERVER_URL ? process.env.SERVER_URL.replace(/\/$/, "") : null,
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, mobile)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

// Serve uploaded images as static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --------------------------------------------------
// API Routes
// --------------------------------------------------
app.use("/api/products", productRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/fix-images", fixImagesRoute);

// --------------------------------------------------
// Health check
// --------------------------------------------------
app.get("/health", (req, res) =>
  res.json({
    status: "ok",
    environment: isProduction ? "production" : "development",
    db:
      mongoose.connection.readyState === 1
        ? "connected"
        : "connecting_or_disconnected",
  })
);

// --------------------------------------------------
// API 404
// --------------------------------------------------
// IMPORTANT:
// Keep API 404s as JSON instead of allowing them to fall
// through to Next.js.
//
// This catches any unknown /api/* request.
// --------------------------------------------------
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

// --------------------------------------------------
// Next.js fallback (Production only)
// --------------------------------------------------
// In production, everything that wasn't handled above goes to Next.js:
//   /
//   /products
//   /about
//   /_next/static/...
//   /_next/image/...
//   /favicon.ico
//
// In development, Next runs independently (e.g. on port 3000).
// --------------------------------------------------
if (isProduction && nextHandle) {
  app.all("*", (req, res) => {
    return nextHandle(req, res);
  });
} else {
  app.all("*", (req, res) => {
    res.status(404).json({
      success: false,
      message: "Route not found.",
    });
  });
}

// --------------------------------------------------
// Error handler
// --------------------------------------------------
app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
});

// --------------------------------------------------
// MongoDB + Server startup
// --------------------------------------------------
const MONGO_URI = process.env.MONGO_URI;

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB Atlas successfully.");
  } catch (err) {
    console.error("MongoDB Atlas connection error:", err.message);
  }

  if (isProduction && nextApp) {
    try {
      await nextApp.prepare();
      console.log("Next.js production app prepared.");
    } catch (err) {
      console.error("Failed to prepare Next.js:", err);
      process.exit(1);
    }
  }

  app.listen(PORT, () => {
    console.log(`Server running in ${isProduction ? "production" : "development"} mode on port ${PORT}`);
    if (isProduction) {
      console.log(`Serving Next.js frontend from: ${path.join(__dirname, "../client")}`);
    }
  });
}

startServer();
