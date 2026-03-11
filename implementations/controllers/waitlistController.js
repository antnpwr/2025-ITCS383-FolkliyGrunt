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
  }
};

module.exports = waitlistController;
