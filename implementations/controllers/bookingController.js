const Booking = require('../models/Booking');
const EquipmentRental = require('../models/EquipmentRental');

// IMPORTANT: Import services from Person 4 when they are ready
const paymentService = require('../services/paymentService');
const notificationService = require('../services/notificationService');

const bookingController = {
    create: async (req, res) => {
        try {
            const { court_id, start_time, duration_hours, equipment, payment_method } = req.body;
            const user_id = req.user.id;

            // Calculate end time
            const start = new Date(start_time);
            const end = new Date(start.getTime() + duration_hours * 60 * 60 * 1000);

            // Get Court pricing
            const Court = require('../models/Court');
            const court = await Court.findById(court_id);
            if (!court) throw new Error('Court not found');
            const courtPrice = parseFloat(court.price_per_hour);

            let total_amount = courtPrice * duration_hours;

            // Equipment fixed prices
            const EQUIPMENT_PRICES = { RACKET: 50, SHUTTLECOCK: 20 };
            
            if (equipment && equipment.length > 0) {
               for (const item of equipment) {
                   const uPrice = EQUIPMENT_PRICES[item.equipment_type] || 0;
                   item.unit_price = uPrice;
                   total_amount += uPrice * item.quantity;
               }
            }

            // Create booking (with SELECT FOR UPDATE for concurrency safety)
            const booking = await Booking.create({
                user_id, court_id, start_time: start, end_time: end, total_amount, payment_method
            });

            // Add equipment if provided
            if (equipment && equipment.length > 0) {
                await EquipmentRental.addToBooking(booking.id, equipment);
            }

            // Process payment via Person 4's payment service
            await paymentService.processPayment({ booking_id: booking.id, amount: total_amount, method: payment_method });

            // Send booking confirmation notification
            const startTimeFormatted = new Date(booking.start_time).toLocaleString();
            const endTimeFormatted = new Date(booking.end_time).toLocaleString();
            
            await notificationService.sendNotification(
                req.user.email,
                '🏸 Booking Confirmed! - Pro Badminton',
                `
                <h2>Booking Confirmed!</h2>
                <p>Your reservation for <strong>${court.name}</strong> is confirmed.</p>
                <p><strong>Time:</strong> ${startTimeFormatted} - ${endTimeFormatted}</p>
                <p><strong>Total Amount:</strong> $${total_amount.toFixed(2)}</p>
                <p>Thank you for choosing Pro Badminton!</p>
                `
            );

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

            // Process refund via Person 4's payment service
            await paymentService.processRefund(booking.id);

            // Check waitlist and notify via Person 4's notification service
            await notificationService.notifyWaitlist(booking.court_id, booking.start_time, booking.end_time);

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
