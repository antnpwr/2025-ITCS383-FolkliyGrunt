const pool = require('../config/db');

class Court {
  // Create a new court (Admin only)
  static async create({ name, location_lat, location_lng, price_per_hour, allowed_shoes, opening_time, closing_time }) {
    const result = await pool.query(
      `INSERT INTO courts (name, location_lat, location_lng, price_per_hour, allowed_shoes, opening_time, closing_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, location_lat, location_lng, price_per_hour, allowed_shoes, opening_time, closing_time]
    );
    return result.rows[0];
  }

  // Get all courts (only AVAILABLE ones for customers)
  static async findAll() {
    const result = await pool.query(
      `SELECT c.*, COALESCE(AVG(r.rating), 0) as avg_rating
       FROM courts c
       LEFT JOIN reviews r ON c.id = r.court_id
       WHERE c.current_status = 'AVAILABLE'
       GROUP BY c.id`
    );
    return result.rows;
  }

  // Search by name
  static async searchByName(name) {
    const result = await pool.query(
      `SELECT c.*, COALESCE(AVG(r.rating), 0) as avg_rating
       FROM courts c
       LEFT JOIN reviews r ON c.id = r.court_id
       WHERE c.current_status = 'AVAILABLE' AND c.name ILIKE $1
       GROUP BY c.id`,
      [`%${name}%`]
    );
    return result.rows;
  }

  // Search by distance (Haversine formula in SQL)
  static async searchByDistance(lat, lng, radiusKm) {
    const result = await pool.query(
      `SELECT c.*, COALESCE(AVG(r.rating), 0) as avg_rating,
        (6371 * acos(
          cos(radians($1)) * cos(radians(c.location_lat)) *
          cos(radians(c.location_lng) - radians($2)) +
          sin(radians($1)) * sin(radians(c.location_lat))
        )) AS distance_km
       FROM courts c
       LEFT JOIN reviews r ON c.id = r.court_id
       WHERE c.current_status = 'AVAILABLE'
       GROUP BY c.id
       HAVING (6371 * acos(
          cos(radians($1)) * cos(radians(c.location_lat)) *
          cos(radians(c.location_lng) - radians($2)) +
          sin(radians($1)) * sin(radians(c.location_lat))
        )) <= $3
       ORDER BY distance_km`,
      [lat, lng, radiusKm]
    );
    return result.rows;
  }

  // Search by max price
  static async searchByPrice(maxPrice) {
    const result = await pool.query(
      `SELECT c.*, COALESCE(AVG(r.rating), 0) as avg_rating
       FROM courts c
       LEFT JOIN reviews r ON c.id = r.court_id
       WHERE c.current_status = 'AVAILABLE' AND c.price_per_hour <= $1
       GROUP BY c.id
       ORDER BY c.price_per_hour`,
      [maxPrice]
    );
    return result.rows;
  }

  // Update court details (Admin only)
  static async update(courtId, { name, location_lat, location_lng, price_per_hour, allowed_shoes, opening_time, closing_time }) {
    const result = await pool.query(
      `UPDATE courts
       SET name = COALESCE($1, name),
           location_lat = COALESCE($2, location_lat),
           location_lng = COALESCE($3, location_lng),
           price_per_hour = COALESCE($4, price_per_hour),
           allowed_shoes = COALESCE($5, allowed_shoes),
           opening_time = COALESCE($6, opening_time),
           closing_time = COALESCE($7, closing_time)
       WHERE id = $8 RETURNING *`,
      [name, location_lat, location_lng, price_per_hour, allowed_shoes, opening_time, closing_time, courtId]
    );
    return result.rows[0];
  }

  // Update court status (Admin only)
  static async updateStatus(courtId, status) {
    const result = await pool.query(
      `UPDATE courts SET current_status = $1 WHERE id = $2 RETURNING *`,
      [status, courtId]
    );
    return result.rows[0];
  }

  // Get single court by ID
  static async findById(courtId) {
    const result = await pool.query(
      `SELECT c.*, COALESCE(AVG(r.rating), 0) as avg_rating, COUNT(r.id) as review_count
       FROM courts c
       LEFT JOIN reviews r ON c.id = r.court_id
       WHERE c.id = $1
       GROUP BY c.id`,
      [courtId]
    );
    return result.rows[0];
  }
}

module.exports = Court;
