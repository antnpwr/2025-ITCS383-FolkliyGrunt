const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authMiddleware, adminOnly } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);

// Protected routes
router.get("/profile", authMiddleware, authController.getProfile);
router.get(
  "/membership/status",
  authMiddleware,
  authController.getMembershipStatus,
);
router.post(
  "/membership/subscribe",
  authMiddleware,
  authController.subscribeMembership,
);

// Admin routes
router.get("/users", authMiddleware, adminOnly, authController.getAllUsers);
router.put(
  "/users/:id/disable",
  authMiddleware,
  adminOnly,
  authController.disableUser,
);

module.exports = router;
