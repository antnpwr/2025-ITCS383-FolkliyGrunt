const Review = require('../models/Review');

const reviewController = {
  create: async (req, res) => {
    try {
      const { court_id, rating, comment_text } = req.body;
      const review = await Review.create({
        user_id: req.user.id,
        court_id,
        rating,
        comment_text
      });
      res.status(201).json(review);
    } catch (error) {
      if (error.message.includes('already reviewed')) {
        return res.status(409).json({ error: error.message });
      }
      if (error.message.includes('Rating must be')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  getByCourtId: async (req, res) => {
    try {
      const data = await Review.findByCourtId(req.params.courtId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getAverageRating: async (req, res) => {
    try {
      const rating = await Review.getAverageRating(req.params.courtId);
      res.json(rating);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getMyReviews: async (req, res) => {
    try {
      const reviews = await Review.findByUser(req.user.id);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = reviewController;
