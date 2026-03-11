const Waitlist = require('../models/Waitlist');

const waitlistController = {
  addToWaitlist: async (req, res) => {
    try {
      const { court_id, requested_date, preferred_time_slot } = req.body;
      const entry = await Waitlist.add({
        user_id: req.user.id,
        court_id,
        requested_date,
        preferred_time_slot
      });
      res.status(201).json(entry);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getMyWaitlist: async (req, res) => {
    try {
      const entries = await Waitlist.findByUser(req.user.id);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  removeFromWaitlist: async (req, res) => {
    // TODO: implement removal
    res.json({ message: 'Removed from waitlist' });
  },

  confirmWaitlist: async (req, res) => {
    try {
      const waitlistId = req.params.id;
      const { payment_method } = req.body;

      // 1. Get waitlist entry
      const pool = require('../config/db');
      const entryResult = await pool.query(
        'SELECT * FROM waitlist WHERE id = $1 AND status = $2 AND user_id = $3', 
        [waitlistId, 'NOTIFIED', req.user.id]
      );
      if (entryResult.rows.length === 0) {
        return res.status(400).json({ error: 'Valid notified waitlist entry not found' });
      }
      const entry = entryResult.rows[0];

      // 2. Parse time slot (e.g., "10:00-12:00")
      const [startStr, endStr] = entry.preferred_time_slot.split('-');
      const requestDateStr = new Date(entry.requested_date).toISOString().split('T')[0];
      const start_time = new Date(`${requestDateStr}T${startStr}:00`);
      const end_time = new Date(`${requestDateStr}T${endStr}:00`);

      const startHour = Number.parseInt(startStr.split(':')[0]);
      const endHour = Number.parseInt(endStr.split(':')[0]);
      const duration = endHour - startHour;

      // 3. Create booking
      const courtQuery = await pool.query('SELECT price_per_hour FROM courts WHERE id = $1', [entry.court_id]);
      const courtPrice = Number.parseFloat(courtQuery.rows[0].price_per_hour);
      const total_amount = courtPrice * duration;

      const booking = await require('../models/Booking').create({
        user_id: req.user.id,
        court_id: entry.court_id,
        start_time,
        end_time,
        total_amount,
        payment_method: payment_method || 'CREDIT_CARD'
      });

      // 4. Run payment
      await require('../services/paymentService').processPayment({ 
        booking_id: booking.id, 
        amount: total_amount, 
        method: payment_method || 'CREDIT_CARD' 
      });

      // 5. Remove parsed waitlist entry
      await pool.query('DELETE FROM waitlist WHERE id = $1', [waitlistId]);

      res.status(201).json({ message: 'Waitlist converted to booking successfully', booking });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = waitlistController;
