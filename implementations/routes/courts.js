const express = require('express');
const router = express.Router();
const courtController = require('../controllers/courtController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');

// Public routes (customers)
router.get('/search', courtController.search);
router.get('/:id', courtController.getById);
router.get('/', courtController.getAll);

// Admin routes (requires login + admin role)
router.post('/', authMiddleware, adminOnly, courtController.create);
router.put('/:id', authMiddleware, adminOnly, courtController.update);
router.put('/:id/status', authMiddleware, adminOnly, courtController.updateStatus);

module.exports = router;
