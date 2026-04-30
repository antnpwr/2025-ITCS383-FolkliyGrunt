// Mock the models BEFORE requiring the controller
jest.mock("../models/Booking");
jest.mock("../models/EquipmentRental");
jest.mock("../models/Court");

const Booking = require("../models/Booking");
const EquipmentRental = require("../models/EquipmentRental");
const Court = require("../models/Court");
const paymentService = require("../services/paymentService");
const notificationService = require("../services/notificationService");
const ORIGINAL_ENV = { ...process.env };
const bookingController = require("../controllers/bookingController");

jest.mock("../services/paymentService", () => ({
  processPayment: jest
    .fn()
    .mockResolvedValue({ success: true, transaction_id: "PP_TEST123" }),
  processRefund: jest.fn().mockResolvedValue({ success: true }),
  getOrCreateCustomer: jest.fn().mockResolvedValue("cus_test_123"),
  createCheckoutSession: jest.fn().mockResolvedValue({
    id: "cs_test_123",
    url: "https://checkout.stripe.com/test",
  }),
  createPaymentIntent: jest.fn().mockResolvedValue({
    payment_intent_id: "pi_test",
    client_secret: "cs_secret",
  }),
  getSavedCards: jest.fn().mockResolvedValue([]),
  createSetupIntent: jest
    .fn()
    .mockResolvedValue({ client_secret: "seti_secret" }),
  deletePaymentMethod: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("../services/notificationService", () => ({
  notifyWaitlist: jest.fn().mockResolvedValue({ notified: true }),
  sendNotification: jest.fn().mockResolvedValue(true),
}));

// Helper to create mock req/res
function mockReqRes(overrides = {}) {
  const req = {
    user: { id: "user-1", email: "test@example.com" },
    params: {},
    body: {},
    headers: { origin: "http://localhost:8080" },
    ...overrides,
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe("bookingController", () => {
  afterEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  // ── create ───────────────────────────────────────────
  describe("create", () => {
    test("creates booking with simulated CREDIT_CARD when BYPASS_STRIPE is true", async () => {
      const booking = {
        id: "b1",
        court_id: "c1",
        start_time: new Date(),
        end_time: new Date(),
      };
      Booking.create.mockResolvedValue(booking);
      Booking.updateTransactionId.mockResolvedValue(booking);
      Court.findById.mockResolvedValue({
        id: "c1",
        name: "Court A",
        price_per_hour: "200",
      });

      const { req, res } = mockReqRes({
        body: {
          court_id: "c1",
          start_time: "2025-06-01T10:00:00",
          duration_hours: 1,
          payment_method: "CREDIT_CARD",
        },
      });

      await bookingController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_id: "PP_TEST123",
          pricing: expect.objectContaining({
            total_amount: 200,
            membership_applied: false,
          }),
        }),
      );
      // In bypass mode, processPayment is called, not createCheckoutSession
      expect(paymentService.processPayment).toHaveBeenCalled();
    });

    test("applies 150 THB member rate when user has active membership", async () => {
      const booking = {
        id: "b-member",
        court_id: "c1",
        start_time: new Date(),
        end_time: new Date(),
      };
      Booking.create.mockResolvedValue(booking);
      Booking.updateTransactionId.mockResolvedValue(booking);
      Court.findById.mockResolvedValue({
        id: "c1",
        name: "Court A",
        price_per_hour: "200",
      });

      const { req, res } = mockReqRes({
        user: {
          id: "user-1",
          email: "test@example.com",
          profile: {
            is_member: true,
            membership_expires_at: "2099-12-31T00:00:00Z",
          },
        },
        body: {
          court_id: "c1",
          start_time: "2025-06-01T10:00:00",
          duration_hours: 2,
          payment_method: "PROMPTPAY",
        },
      });

      await bookingController.create(req, res);

      expect(Booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          total_amount: 300,
        }),
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pricing: expect.objectContaining({
            membership_applied: true,
            applied_rate: 150,
            member_savings: 100,
            total_amount: 300,
          }),
        }),
      );
    });

    test("creates booking with PROMPTPAY (simulated) and returns booking", async () => {
      const booking = {
        id: "b2",
        court_id: "c1",
        start_time: new Date(),
        end_time: new Date(),
      };
      Booking.create.mockResolvedValue(booking);
      Booking.updateTransactionId.mockResolvedValue(booking);
      Court.findById.mockResolvedValue({
        id: "c1",
        name: "Court B",
        price_per_hour: "100",
      });

      const { req, res } = mockReqRes({
        body: {
          court_id: "c1",
          start_time: "2025-06-01T10:00:00",
          duration_hours: 2,
          payment_method: "PROMPTPAY",
          total_amount: 200,
        },
      });

      await bookingController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(paymentService.processPayment).toHaveBeenCalled();
      // Should NOT call Stripe checkout for PromptPay
      expect(paymentService.createCheckoutSession).not.toHaveBeenCalled();
    });

    test("creates booking with equipment", async () => {
      const booking = {
        id: "b3",
        court_id: "c1",
        start_time: new Date(),
        end_time: new Date(),
      };
      Booking.create.mockResolvedValue(booking);
      Booking.updateTransactionId.mockResolvedValue(booking);
      Court.findById.mockResolvedValue({
        id: "c1",
        name: "Court C",
        price_per_hour: "200",
      });
      EquipmentRental.addToBooking.mockResolvedValue([]);

      const equipment = [
        { equipment_type: "RACKET", quantity: 1, unit_price: 50 },
      ];
      const { req, res } = mockReqRes({
        body: {
          court_id: "c1",
          start_time: "2025-06-01T10:00:00",
          duration_hours: 1,
          payment_method: "BANK_TRANSFER",
          total_amount: 250,
          equipment,
        },
      });

      await bookingController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(EquipmentRental.addToBooking).toHaveBeenCalledWith(
        "b3",
        equipment,
      );
    });

    test("returns 500 when court is not found", async () => {
      Booking.create.mockResolvedValue({});
      Court.findById.mockResolvedValue(null);

      const { req, res } = mockReqRes({
        body: {
          court_id: "missing",
          start_time: "2025-06-01T10:00:00",
          duration_hours: 1,
          payment_method: "PROMPTPAY",
        },
      });

      await bookingController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Court not found" });
      expect(paymentService.processPayment).not.toHaveBeenCalled();
    });

    test("returns 500 when rental equipment fails", async () => {
      const booking = {
        id: "b5",
        court_id: "c1",
        start_time: new Date(),
        end_time: new Date(),
      };
      Booking.create.mockResolvedValue(booking);
      Booking.updateTransactionId.mockResolvedValue(booking);
      Court.findById.mockResolvedValue({
        id: "c1",
        name: "Court C",
        price_per_hour: "200",
      });
      EquipmentRental.addToBooking.mockRejectedValue(new Error("Rental error"));

      const { req, res } = mockReqRes({
        body: {
          court_id: "c1",
          start_time: "2025-06-01T10:00:00",
          duration_hours: 1,
          payment_method: "BANK_TRANSFER",
          equipment: [{ equipment_type: "RACKET", quantity: 1 }],
        },
      });

      await bookingController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Rental error" });
    });

    test("returns 409 when timeslot is already booked", async () => {
      Booking.create.mockRejectedValue(
        new Error("Time slot is already booked"),
      );
      Court.findById.mockResolvedValue({
        id: "c1",
        name: "Court A",
        price_per_hour: "100",
      });

      const { req, res } = mockReqRes({
        body: {
          court_id: "c1",
          start_time: "2025-06-01T10:00:00",
          duration_hours: 1,
          payment_method: "PROMPTPAY",
          total_amount: 100,
        },
      });

      await bookingController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: "Time slot is already booked",
      });
    });

    test("returns 500 on unexpected error", async () => {
      Booking.create.mockRejectedValue(new Error("Unexpected"));
      Court.findById.mockResolvedValue({
        id: "c1",
        name: "Court A",
        price_per_hour: "100",
      });

      const { req, res } = mockReqRes({
        body: {
          court_id: "c1",
          start_time: "2025-06-01T10:00:00",
          duration_hours: 1,
          payment_method: "PROMPTPAY",
        },
      });

      await bookingController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Unexpected" });
    });
  });

  // ── cancel ───────────────────────────────────────────
  describe("cancel", () => {
    test("cancels booking and returns success message", async () => {
      const booking = {
        id: "b1",
        booking_status: "CANCELLED",
        transaction_id: "PP_TEST",
        court_id: "c1",
        start_time: new Date(),
        end_time: new Date(),
      };
      Booking.cancel.mockResolvedValue(booking);

      const { req, res } = mockReqRes({ params: { id: "b1" } });
      await bookingController.cancel(req, res);

      expect(res.json).toHaveBeenCalledWith({
        message: "Booking cancelled, refund processed",
        booking,
      });
      expect(paymentService.processRefund).toHaveBeenCalledWith("PP_TEST");
      expect(notificationService.notifyWaitlist).toHaveBeenCalled();
    });

    test("cancels booking without transaction_id and skips refund", async () => {
      const booking = {
        id: "b2",
        booking_status: "CANCELLED",
        court_id: "c1",
        start_time: new Date(),
        end_time: new Date(),
      };
      Booking.cancel.mockResolvedValue(booking);

      const { req, res } = mockReqRes({ params: { id: "b2" } });
      await bookingController.cancel(req, res);

      expect(res.json).toHaveBeenCalledWith({
        message: "Booking cancelled, refund processed",
        booking,
      });
      expect(paymentService.processRefund).not.toHaveBeenCalled();
      expect(notificationService.notifyWaitlist).toHaveBeenCalled();
    });

    test("returns 400 when booking cannot be cancelled", async () => {
      Booking.cancel.mockResolvedValue(null);

      const { req, res } = mockReqRes({ params: { id: "b1" } });
      await bookingController.cancel(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Cannot cancel - booking not found or play time already started",
      });
    });

    test("returns 500 on cancel error", async () => {
      Booking.cancel.mockRejectedValue(new Error("DB error"));

      const { req, res } = mockReqRes({ params: { id: "b1" } });
      await bookingController.cancel(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getMyBookings ────────────────────────────────────
  describe("getMyBookings", () => {
    test("returns user bookings", async () => {
      const bookings = [{ id: "b1" }, { id: "b2" }];
      Booking.findByUser.mockResolvedValue(bookings);

      const { req, res } = mockReqRes();
      await bookingController.getMyBookings(req, res);

      expect(res.json).toHaveBeenCalledWith(bookings);
    });

    test("returns 500 on error", async () => {
      Booking.findByUser.mockRejectedValue(new Error("fail"));

      const { req, res } = mockReqRes();
      await bookingController.getMyBookings(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getEquipment ─────────────────────────────────────
  describe("getEquipment", () => {
    test("returns equipment for a booking", async () => {
      const equipment = [{ id: "e1", equipment_type: "RACKET" }];
      EquipmentRental.findByBooking.mockResolvedValue(equipment);

      const { req, res } = mockReqRes({ params: { id: "b1" } });
      await bookingController.getEquipment(req, res);

      expect(res.json).toHaveBeenCalledWith(equipment);
    });

    test("returns 500 on error", async () => {
      EquipmentRental.findByBooking.mockRejectedValue(new Error("fail"));

      const { req, res } = mockReqRes({ params: { id: "b1" } });
      await bookingController.getEquipment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── rentEquipment ────────────────────────────────────
  describe("rentEquipment", () => {
    test("rents equipment and returns 201", async () => {
      EquipmentRental.addToBooking.mockResolvedValue([{ id: "e1" }]);

      const { req, res } = mockReqRes({
        params: { id: "b1" },
        body: [{ equipment_type: "RACKET", quantity: 2 }],
      });

      await bookingController.rentEquipment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("returns 400 for invalid rental data", async () => {
      const { req, res } = mockReqRes({
        params: { id: "b1" },
        body: [],
      });

      await bookingController.rentEquipment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
