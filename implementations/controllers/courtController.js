const Court = require('../models/Court');

const courtController = {
  // GET /api/courts/search?name=xxx&lat=13.7&lng=100.5&radius=10&maxPrice=200
  search: async (req, res) => {
    try {
      const { name, lat, lng, radius, maxPrice } = req.query;

      let courts;
      if (name) {
        courts = await Court.searchByName(name);
      } else if (lat && lng && radius) {
        courts = await Court.searchByDistance(parseFloat(lat), parseFloat(lng), parseFloat(radius));
      } else if (maxPrice) {
        courts = await Court.searchByPrice(parseFloat(maxPrice));
      } else {
        courts = await Court.findAll();
      }

      res.json(courts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/courts
  getAll: async (req, res) => {
    try {
      const courts = await Court.findAll();
      res.json(courts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/courts/:id
  getById: async (req, res) => {
    try {
      const court = await Court.findById(req.params.id);
      if (!court) {
        return res.status(404).json({ error: 'Court not found' });
      }
      res.json(court);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/courts  (Admin only)
  create: async (req, res) => {
    try {
      const { name, location_lat, location_lng, price_per_hour, allowed_shoes, opening_time, closing_time } = req.body;

      // Basic validation
      if (!name || !location_lat || !location_lng || !price_per_hour || !opening_time || !closing_time) {
        return res.status(400).json({ error: 'Missing required fields: name, location_lat, location_lng, price_per_hour, opening_time, closing_time' });
      }

      const court = await Court.create({
        name,
        location_lat,
        location_lng,
        price_per_hour,
        allowed_shoes,
        opening_time,
        closing_time
      });

      res.status(201).json({ message: 'Court created successfully', court });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // PUT /api/courts/:id  (Admin only)
  update: async (req, res) => {
    try {
      const { name, location_lat, location_lng, price_per_hour, allowed_shoes, opening_time, closing_time } = req.body;

      const court = await Court.update(req.params.id, {
        name,
        location_lat,
        location_lng,
        price_per_hour,
        allowed_shoes,
        opening_time,
        closing_time
      });

      if (!court) {
        return res.status(404).json({ error: 'Court not found' });
      }

      res.json({ message: 'Court updated successfully', court });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // PUT /api/courts/:id/status  (Admin only)
  updateStatus: async (req, res) => {
    try {
      const { status } = req.body;

      const validStatuses = ['AVAILABLE', 'RENOVATE', 'DAMAGED'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
      }

      const court = await Court.updateStatus(req.params.id, status);

      if (!court) {
        return res.status(404).json({ error: 'Court not found' });
      }

      res.json({ message: 'Court status updated successfully', court });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = courtController;
