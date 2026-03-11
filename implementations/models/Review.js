const pool = require('../config/db');

class Review {
  // Create a new review
  static async create({ user_id, court_id, rating, comment_text }) {
    // Validate rating range
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check if user already reviewed this court (one review per user per court)
    const existing = await pool.query(
      `SELECT id FROM reviews WHERE user_id = $1 AND court_id = $2`,
      [user_id, court_id]
    );
    if (existing.rows.length > 0) {
      throw new Error('You have already reviewed this court');
    }

    const result = await pool.query(
      `INSERT INTO reviews (user_id, court_id, rating, comment_text)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, court_id, rating, comment_text]
    );
    return result.rows[0];
  }

  // Get all reviews for a court
  static async findByCourtId(courtId) {
    const result = await pool.query(
      `SELECT r.*, p.full_name as reviewer_name
       FROM reviews r
       LEFT JOIN profiles p ON r.user_id = p.auth_id
       WHERE r.court_id = $1
       ORDER BY r.created_at DESC`,
      [courtId]
    );
    return result.rows;
  }

  // Get average rating for a court
  static async getAverageRating(courtId) {
    const result = await pool.query(
      `SELECT
         COALESCE(AVG(rating), 0) as average_rating,
         COUNT(id) as total_reviews
       FROM reviews
       WHERE court_id = $1`,
      [courtId]
    );
    return {
      average_rating: parseFloat(result.rows[0].average_rating).toFixed(1),
      total_reviews: parseInt(result.rows[0].total_reviews)
    };
  }

  // Get reviews by a specific user
  static async findByUser(userId) {
    const result = await pool.query(
      `SELECT r.*, c.name as court_name
       FROM reviews r
       JOIN courts c ON r.court_id = c.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );
    return result.rows;
  }
}

module.exports = Review;
