const pool = require('../config/db');

class EquipmentRental {
    // Add equipment to a booking
    static async addToBooking(bookingId, items) {
        // items = [{ equipment_type: 'RACKET', quantity: 2, unit_price: 50 }]
        const results = [];
        for (const item of items) {
            const result = await pool.query(
                `INSERT INTO equipment_rental (booking_id, equipment_type, quantity, unit_price)
         VALUES ($1, $2, $3, $4) RETURNING *`,
                [bookingId, item.equipment_type, item.quantity, item.unit_price]
            );
            results.push(result.rows[0]);
        }
        return results;
    }

    // Get equipment for a booking
    static async findByBooking(bookingId) {
        const result = await pool.query(
            `SELECT * FROM equipment_rental WHERE booking_id = $1`,
            [bookingId]
        );
        return result.rows;
    }
}

module.exports = EquipmentRental;
