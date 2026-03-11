const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All booking routes require authentication
router.use(authMiddleware);

router.post('/', bookingController.create);           // Book a court
router.get('/my', bookingController.getMyBookings);    // My bookings
router.delete('/:id', bookingController.cancel);       // Cancel booking
router.get('/:id/equipment', bookingController.getEquipment); // Equipment for booking
router.post('/:id/equipment', bookingController.rentEquipment); // Rent Equipment for booking

module.exports = router;
