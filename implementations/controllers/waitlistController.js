const pool = require('../config/db');
const Waitlist = require('../models/Waitlist');
const Booking = require('../models/Booking');
const paymentService = require('../services/paymentService');

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
    try {
      await Waitlist.remove(req.params.id, req.user.id);
      res.json({ message: 'Removed from waitlist' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  confirmWaitlist: async (req, res) => {
    try {
      const waitlistId = req.params.id;
      const { payment_method, transfer_reference } = req.body;

      // 1. Get waitlist entry
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

      const booking = await Booking.create({
        user_id: req.user.id,
        court_id: entry.court_id,
        start_time,
        end_time,
        total_amount,
        payment_method: payment_method || 'CREDIT_CARD'
      });

      // 4. Run payment
      await paymentService.processPayment({ 
        booking_id: booking.id, 
        amount: total_amount, 
        method: payment_method || 'CREDIT_CARD',
        transfer_reference: transfer_reference
      });

      // 5. Update waitlist entry status instead of deleting to show "Payment Successful"
      await Waitlist.updateStatus(waitlistId, 'CONFIRMED');

      res.status(201).json({ message: 'Payment Successful! Booking confirmed.', booking });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = waitlistController;
