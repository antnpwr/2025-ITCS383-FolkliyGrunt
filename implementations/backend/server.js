const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("node:path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;
const API_PREFIX = "/api";
const ENABLE_FRONTEND = process.env.ENABLE_FRONTEND !== "false";
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow requests without an Origin header (mobile apps, curl, server-to-server).
    if (!origin) return callback(null, true);

    if (CORS_ORIGINS.length === 0 || CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed by CORS"));
  },
};

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          "unpkg.com",
          "js.stripe.com",
        ],
        "style-src": [
          "'self'",
          "'unsafe-inline'",
          "fonts.googleapis.com",
          "unpkg.com",
        ],
        "img-src": ["'self'", "data:", "https:", "*.basemaps.cartocdn.com"],
        "connect-src": [
          "'self'",
          "https://*.supabase.co",
          "https://api.stripe.com",
        ],
        "font-src": ["'self'", "fonts.gstatic.com"],
        "frame-src": ["'self'", "js.stripe.com", "hooks.stripe.com"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  }),
);
app.use(cors(corsOptions));
app.use(express.json());

if (ENABLE_FRONTEND) {
  app.use(express.static(path.join(__dirname, "..", "frontend")));
}

app.use("/locales", express.static(path.join(__dirname, "locales")));

// Routes — each person registers their own route file here
app.use(`${API_PREFIX}/auth`, require("./routes/auth"));
app.use(`${API_PREFIX}/courts`, require("./routes/courts")); // Person 2
// app.use('/api/bookings', require('./routes/bookings')); // Person 3
// app.use('/api/courts', require('./routes/courts'));     // Person 2
app.use(`${API_PREFIX}/bookings`, require("./routes/bookings")); // Person 3
app.use(`${API_PREFIX}/community`, require("./routes/community"));
app.use(`${API_PREFIX}/waitlist`, require("./routes/waitlist")); // Person 4
app.use(`${API_PREFIX}/reviews`, require("./routes/reviews")); // Person 5
app.use(`${API_PREFIX}/payments`, require("./routes/payments")); // Stripe payments & saved cards

// Health check
app.get(`${API_PREFIX}/health`, (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mobile clients can check this endpoint for compatibility information.
app.get(`${API_PREFIX}/meta`, (req, res) => {
  res.json({
    name: "FolkliyGrunt API",
    version: "v1",
    apiPrefix: API_PREFIX,
    frontendEnabled: ENABLE_FRONTEND,
    timestamp: new Date().toISOString(),
  });
});

// Ensure unknown API routes always return JSON (not HTML).
app.use(API_PREFIX, (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// Last-resort JSON error handler for API clients.
app.use((err, req, res, next) => {
  if (req.path.startsWith(API_PREFIX)) {
    const statusCode = err.status || 500;
    return res
      .status(statusCode)
      .json({ error: err.message || "Internal server error" });
  }

  return next(err);
});

// Start server (only if not in test mode)
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
