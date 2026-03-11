const pool = require('../config/db');

class Waitlist {
  // Add user to waitlist for a specific court + date
  static async add({ user_id, court_id, requested_date, preferred_time_slot }) {
    const result = await pool.query(
      `INSERT INTO waitlist (user_id, court_id, requested_date, preferred_time_slot)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, court_id, requested_date, preferred_time_slot]
    );
    return result.rows[0];
  }

  // Get next user in queue for a specific court (FIFO — oldest first)
  static async getNextInQueue(courtId) {
    const result = await pool.query(
      `SELECT w.*, au.email, p.full_name
       FROM waitlist w
       JOIN profiles p ON w.user_id = p.auth_id
       JOIN auth.users au ON w.user_id = au.id
       WHERE w.court_id = $1 AND w.status = 'PENDING'
       ORDER BY w.created_at ASC
       LIMIT 1`,
      [courtId]
    );
    return result.rows[0]; // null if no one is waiting
  }

  // Mark waitlist entry as notified
  static async markNotified(waitlistId) {
    const result = await pool.query(
      `UPDATE waitlist SET status = 'NOTIFIED' WHERE id = $1 RETURNING *`,
      [waitlistId]
    );
    return result.rows[0];
  }

  // Get waitlist entries for a user
  static async findByUser(userId) {
    const result = await pool.query(
      `SELECT w.*, c.name as court_name
       FROM waitlist w
       JOIN courts c ON w.court_id = c.id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  // Expire old waitlist entries (optional: run periodically)
  static async expireOldEntries() {
    const result = await pool.query(
      `UPDATE waitlist SET status = 'EXPIRED'
       WHERE status = 'PENDING' AND requested_date < CURRENT_DATE
       RETURNING *`
    );
    return result.rows;
  }
}

module.exports = Waitlist;
