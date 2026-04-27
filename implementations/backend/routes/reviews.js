const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Public routes
router.get('/court/:courtId', reviewController.getByCourtId);
router.get('/court/:courtId/rating', reviewController.getAverageRating);

// Protected routes (requires login)
router.post('/', authMiddleware, reviewController.create);
router.get('/my', authMiddleware, reviewController.getMyReviews);

module.exports = router;
