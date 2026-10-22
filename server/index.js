require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const productRoutes = require("./routes/productRoutes");
const projectRoutes = require("./routes/projectRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const fixImagesRoute = require("./routes/fixImagesRoute");
const arRoutes = require("./routes/arRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV?.trim().toLowerCase() === "production";

const serveFrontend = isProduction || process.env.SERVE_FRONTEND === "true";

let nextApp = null;
let nextHandle = null;
let upgradeHandler = null;

if (serveFrontend) {
  let next;
  try {
    next = require("next");
  } catch (err) {
    try {
      next = require(path.join(__dirname, "../client/node_modules/next"));
    } catch (e) {
      console.error("Failed to load Next.js module:", e.message);
    }
  }

  if (next) {
    nextApp = next({
      dev: !isProduction,
      dir: path.join(__dirname, "../client"),
    });

    nextHandle = nextApp.getRequestHandler();
  }
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
app.use("/images", express.static(path.join(__dirname, "../client/public/images")));

// --------------------------------------------------
// API Routes
// --------------------------------------------------
app.use("/api/products", productRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/fix-images", fixImagesRoute);
app.use("/api/ar", arRoutes);

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
if (nextHandle) {
  app.all("*", (req, res) => {
    return nextHandle(req, res);
  });
} else {
  // If Next.js is running separately in development (e.g. port 3000),
  // provide a clear root status response instead of 404
  app.get("/", (req, res) => {
    res.json({
      success: true,
      service: "Fenchel Shades API Backend",
      port: PORT,
      frontendUrl: "http://localhost:3000",
      api: `http://localhost:${PORT}/api`,
      message:
        "The backend server is running. The Next.js frontend runs on http://localhost:3000. For mobile testing or AR preview with ngrok, tunnel port 3000 ('ngrok http 3000').",
    });
  });

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
// MongoDB + Server startup (Atlas / Local)
// --------------------------------------------------
const MONGO_URI = process.env.MONGO_URI;

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB successfully: ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
  }

  if (nextApp) {
    try {
      await nextApp.prepare();
      upgradeHandler = nextApp.getUpgradeHandler();
      console.log(`Next.js (${isProduction ? "production" : "development"}) ready.`);
    } catch (err) {
      console.error("Failed to prepare Next.js:", err);
    }
  }

  const server = http.createServer(app);

  // Attach WebSocket upgrade handler for Next.js HMR live-reload
  if (upgradeHandler) {
    server.on("upgrade", (req, socket, head) => {
      upgradeHandler(req, socket, head);
    });
  }

  server.listen(PORT, () => {
    console.log(`🚀 Backend Server running on http://localhost:${PORT}`);
    if (nextApp) {
      console.log(`- Unified Frontend: http://localhost:${PORT}`);
    } else {
      console.log(`- Backend API: http://localhost:${PORT}/api`);
      console.log(`- Next.js Frontend: http://localhost:3000`);
      console.log(`- ngrok command for mobile/AR: ngrok http 3000`);
    }
    console.log(`- Uploads: http://localhost:${PORT}/uploads`);
  });
}

startServer();
