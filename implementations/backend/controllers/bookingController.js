const Booking = require("../models/Booking");
const EquipmentRental = require("../models/EquipmentRental");
const paymentService = require("../services/paymentService");
const notificationService = require("../services/notificationService");

const BYPASS_STRIPE =
  !process.env.STRIPE_SECRET_KEY || process.env.BYPASS_STRIPE === "true";

const MEMBER_RATE_THB_PER_HOUR = 150;
const STANDARD_RATE_THB_PER_HOUR = 200;

const bookingController = {
  create: async (req, res) => {
    try {
      const {
        court_id,
        start_time,
        duration_hours,
        equipment,
        payment_method,
        transfer_reference,
      } = req.body;
      const user_id = req.user.id;

      // Calculate end time
      const start = new Date(start_time);
      const end = new Date(start.getTime() + duration_hours * 60 * 60 * 1000);

      // Get Court pricing
      const Court = require("../models/Court");
      const court = await Court.findById(court_id);
      if (!court) throw new Error("Court not found");
      const standardCourtRate = STANDARD_RATE_THB_PER_HOUR;

      const membershipActive =
        Boolean(req.user.profile?.is_member) &&
        Boolean(req.user.profile?.membership_expires_at) &&
        new Date(req.user.profile.membership_expires_at) > new Date();

      const appliedCourtRate = membershipActive
        ? MEMBER_RATE_THB_PER_HOUR
        : standardCourtRate;

      const court_fee = appliedCourtRate * duration_hours;
      let equipment_fee = 0;
      let total_amount = court_fee;

      // Equipment fixed prices
      const EQUIPMENT_PRICES = {
        RACKET: 50,
        SHUTTLECOCK: 20,
        BALL: 30,
        BAG: 20,
      };

      if (equipment && equipment.length > 0) {
        for (const item of equipment) {
          const uPrice = EQUIPMENT_PRICES[item.equipment_type] || 0;
          item.unit_price = uPrice;
          equipment_fee += uPrice * item.quantity;
          total_amount += uPrice * item.quantity;
        }
      }

      const member_savings = membershipActive
        ? Math.max(
            (standardCourtRate - MEMBER_RATE_THB_PER_HOUR) * duration_hours,
            0,
          )
        : 0;

      // Create booking (with SELECT FOR UPDATE for concurrency safety)
      const booking = await Booking.create({
        user_id,
        court_id,
        start_time: start,
        end_time: end,
        total_amount,
        payment_method,
      });

      // Add equipment if provided
      if (equipment && equipment.length > 0) {
        await EquipmentRental.addToBooking(booking.id, equipment);
      }

      // ─── Payment Processing ───
      if (payment_method === "CREDIT_CARD" && !BYPASS_STRIPE) {
        // Get or create customer for Stripe
        const customer_id = await paymentService.getOrCreateCustomer(
          req.user.id,
          req.user.email,
        );

        const origin = req.headers.origin || "http://localhost:8080";
        const session = await paymentService.createCheckoutSession({
          customerId: customer_id,
          amount: total_amount,
          booking_id: booking.id,
          court_name: court.name,
          success_url: `${origin}/pages/my-bookings.html?payment=success`,
          cancel_url: `${origin}/pages/my-bookings.html?payment=cancelled`,
        });

        await Booking.updateTransactionId(booking.id, session.id);

        // Return URL so frontend can redirect
        return res.status(201).json({
          checkout_url: session.url,
          pricing: {
            standard_rate: standardCourtRate,
            applied_rate: appliedCourtRate,
            member_rate: MEMBER_RATE_THB_PER_HOUR,
            membership_applied: membershipActive,
            member_savings,
            court_fee,
            equipment_fee,
            total_amount,
          },
        });
      }

      // For PROMPTPAY, BANK_TRANSFER, or CREDIT_CARD (bypassed) — simulated payment
      const paymentResult = await paymentService.processPayment({
        booking_id: booking.id,
        amount: total_amount,
        method: payment_method,
        transfer_reference,
      });

      // Update booking with transaction ID
      await Booking.updateTransactionId(
        booking.id,
        paymentResult.transaction_id,
      );

      // Send booking confirmation notification
      const startTimeFormatted = new Date(booking.start_time).toLocaleString();
      const endTimeFormatted = new Date(booking.end_time).toLocaleString();

      await notificationService.sendNotification(
        req.user.email,
        "🏸 Booking Confirmed! - Pro Badminton",
        `
                <h2>Booking Confirmed!</h2>
                <p>Your reservation for <strong>${court.name}</strong> is confirmed.</p>
                <p><strong>Time:</strong> ${startTimeFormatted} - ${endTimeFormatted}</p>
                <p><strong>Total Amount:</strong> ฿${total_amount.toFixed(2)}</p>
                <p><strong>Transaction ID:</strong> ${paymentResult.transaction_id}</p>
                <p>Thank you for choosing Pro Badminton!</p>
                `,
      );

      res.status(201).json({
        ...booking,
        transaction_id: paymentResult.transaction_id,
        pricing: {
          standard_rate: standardCourtRate,
          applied_rate: appliedCourtRate,
          member_rate: MEMBER_RATE_THB_PER_HOUR,
          membership_applied: membershipActive,
          member_savings,
          court_fee,
          equipment_fee,
          total_amount,
        },
      });
    } catch (error) {
      if (error.message === "Time slot is already booked") {
        return res.status(409).json({ error: error.message });
      }
      console.error("[BOOKING] Create error:", error.message);
      res.status(500).json({ error: error.message });
    }
  },

  cancel: async (req, res) => {
    try {
      const booking = await Booking.cancel(req.params.id, req.user.id);
      if (!booking) {
        return res.status(400).json({
          error:
            "Cannot cancel - booking not found or play time already started",
        });
      }

      // Process refund via payment service
      if (booking.transaction_id) {
        await paymentService.processRefund(booking.transaction_id);
      }

      // Check waitlist and notify
      await notificationService.notifyWaitlist(
        booking.court_id,
        booking.start_time,
        booking.end_time,
      );

      res.json({ message: "Booking cancelled, refund processed", booking });
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

  rentEquipment: async (req, res) => {
    try {
      const bookingId = req.params.id;
      const items = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          error: "Missing or invalid rental data. Expecting an array of items.",
        });
      }

      const data = await EquipmentRental.addToBooking(bookingId, items);

      res
        .status(201)
        .json({ message: "Equipment rented successfully", equipment: data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to rent equipment." });
    }
  },
};

module.exports = bookingController;
