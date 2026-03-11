const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', authMiddleware, authController.getProfile);

// Admin routes
router.put('/users/:id/disable', authMiddleware, adminOnly, authController.disableUser);

module.exports = router;
