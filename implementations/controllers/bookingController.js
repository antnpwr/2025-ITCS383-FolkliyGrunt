const Booking = require('../models/Booking');
const EquipmentRental = require('../models/EquipmentRental');

// IMPORTANT: Import services from Person 4 when they are ready
// const paymentService = require('../services/paymentService');
// const notificationService = require('../services/notificationService');

const bookingController = {
    create: async (req, res) => {
        try {
            const { court_id, start_time, duration_hours, equipment, payment_method } = req.body;
            const user_id = req.user.id;

            // Calculate end time
            const start = new Date(start_time);
            const end = new Date(start.getTime() + duration_hours * 60 * 60 * 1000);

            // TODO: Calculate total_amount from court price + equipment prices
            const total_amount = req.body.total_amount || 0;

            // Create booking (with SELECT FOR UPDATE for concurrency safety)
            const booking = await Booking.create({
                user_id, court_id, start_time: start, end_time: end, total_amount, payment_method
            });

            // Add equipment if provided
            if (equipment && equipment.length > 0) {
                await EquipmentRental.addToBooking(booking.id, equipment);
            }

            // TODO: Process payment via Person 4's payment service
            // await paymentService.processPayment({ booking_id: booking.id, amount: total_amount, method: payment_method });

            res.status(201).json(booking);
        } catch (error) {
            if (error.message === 'Time slot is already booked') {
                return res.status(409).json({ error: error.message });
            }
            res.status(500).json({ error: error.message });
        }
    },

    cancel: async (req, res) => {
        try {
            const booking = await Booking.cancel(req.params.id, req.user.id);
            if (!booking) {
                return res.status(400).json({ error: 'Cannot cancel - booking not found or play time already started' });
            }

            // TODO: Process refund via Person 4's payment service
            // await paymentService.processRefund(booking.id);

            // TODO: Check waitlist and notify via Person 4's notification service
            // await notificationService.notifyWaitlist(booking.court_id, booking.start_time, booking.end_time);

            res.json({ message: 'Booking cancelled, refund processed', booking });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getMyBookings: async (req, res) => {
        try {
            const bookings = await Booking.findByUser(req.user.id);
            res.json(bookings);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getEquipment: async (req, res) => {
        try {
            const equipment = await EquipmentRental.findByBooking(req.params.id);
            res.json(equipment);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
};

module.exports = bookingController;
