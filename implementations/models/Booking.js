const pool = require('../config/db');

class Booking {
    // Create booking with SELECT FOR UPDATE to prevent double booking
    static async create({ user_id, court_id, start_time, end_time, total_amount, payment_method }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Lock the timeslot to prevent double booking (concurrency safety)
            const conflict = await client.query(
                `SELECT id FROM bookings
         WHERE court_id = $1
           AND booking_status = 'CONFIRMED'
           AND start_time < $3
           AND end_time > $2
         FOR UPDATE`,
                [court_id, start_time, end_time]
            );

            if (conflict.rows.length > 0) {
                await client.query('ROLLBACK');
                throw new Error('Time slot is already booked');
            }

            const result = await client.query(
                `INSERT INTO bookings (user_id, court_id, start_time, end_time, total_amount, payment_method, transaction_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [user_id, court_id, start_time, end_time, total_amount, payment_method, null]
            );

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Cancel booking (only if play time hasn't started)
    static async cancel(bookingId, userId) {
        const result = await pool.query(
            `UPDATE bookings SET booking_status = 'CANCELLED'
       WHERE id = $1 AND user_id = $2 AND start_time > NOW() AND booking_status = 'CONFIRMED'
       RETURNING *`,
            [bookingId, userId]
        );
        return result.rows[0]; // null if not eligible for cancellation
    }

    // Get bookings for a user
    static async findByUser(userId) {
        const result = await pool.query(
            `SELECT b.*, c.name as court_name
       FROM bookings b
       JOIN courts c ON b.court_id = c.id
       WHERE b.user_id = $1
       ORDER BY b.start_time DESC`,
            [userId]
        );
        return result.rows;
    }

    // Check if timeslot is available
    static async checkAvailability(courtId, startTime, endTime) {
        const result = await pool.query(
            `SELECT id FROM bookings
       WHERE court_id = $1 AND booking_status = 'CONFIRMED'
         AND start_time < $3 AND end_time > $2`,
            [courtId, startTime, endTime]
        );
        return result.rows.length === 0; // true = available
    }
    // Update transaction ID
    static async updateTransactionId(bookingId, transactionId) {
        const result = await pool.query(
            `UPDATE bookings SET transaction_id = $1 WHERE id = $2 RETURNING *`,
            [transactionId, bookingId]
        );
        return result.rows[0];
    }
}

module.exports = Booking;
