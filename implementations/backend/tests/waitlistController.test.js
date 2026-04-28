// Mock dependencies BEFORE requiring the controller
jest.mock('../models/Waitlist');
jest.mock('../models/Booking');
jest.mock('../config/db', () => ({
  query: jest.fn()
}));
jest.mock('../services/paymentService', () => ({
  processPayment: jest.fn().mockResolvedValue({ success: true, transaction_id: 'TX_123' })
}));

const Waitlist = require('../models/Waitlist');
const Booking = require('../models/Booking');
const pool = require('../config/db');
const paymentService = require('../services/paymentService');
const waitlistController = require('../controllers/waitlistController');

// Helper to create mock req/res
function mockReqRes(overrides = {}) {
  const req = {
    user: { id: 'user-1' },
    params: {},
    body: {},
    ...overrides
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return { req, res };
}

describe('waitlistController', () => {
  afterEach(() => jest.clearAllMocks());

  // ── addToWaitlist ─────────────────────────────────────
  describe('addToWaitlist', () => {
    test('adds entry and returns 201', async () => {
      const entry = { id: 'w1', court_id: 'c1', status: 'PENDING' };
      Waitlist.add.mockResolvedValue(entry);

      const { req, res } = mockReqRes({
        body: {
          court_id: 'c1',
          requested_date: '2025-04-01',
          preferred_time_slot: '09:00-11:00'
        }
      });

      await waitlistController.addToWaitlist(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(entry);
      expect(Waitlist.add).toHaveBeenCalledWith({
        user_id: 'user-1',
        court_id: 'c1',
        requested_date: '2025-04-01',
        preferred_time_slot: '09:00-11:00'
      });
    });

    test('returns 500 on error', async () => {
      Waitlist.add.mockRejectedValue(new Error('DB error'));

      const { req, res } = mockReqRes({
        body: { court_id: 'c1', requested_date: '2025-04-01' }
      });

      await waitlistController.addToWaitlist(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
    });
  });

  // ── getMyWaitlist ─────────────────────────────────────
  describe('getMyWaitlist', () => {
    test('returns user waitlist entries', async () => {
      const entries = [{ id: 'w1' }, { id: 'w2' }];
      Waitlist.findByUser.mockResolvedValue(entries);

      const { req, res } = mockReqRes();
      await waitlistController.getMyWaitlist(req, res);

      expect(res.json).toHaveBeenCalledWith(entries);
      expect(Waitlist.findByUser).toHaveBeenCalledWith('user-1');
    });

    test('returns 500 on error', async () => {
      Waitlist.findByUser.mockRejectedValue(new Error('fail'));

      const { req, res } = mockReqRes();
      await waitlistController.getMyWaitlist(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── removeFromWaitlist ────────────────────────────────
  describe('removeFromWaitlist', () => {
    test('returns removal message', async () => {
      Waitlist.remove.mockResolvedValue();
      const { req, res } = mockReqRes({ params: { id: 'w1' } });
      await waitlistController.removeFromWaitlist(req, res);

      expect(Waitlist.remove).toHaveBeenCalledWith('w1', 'user-1');
      expect(res.json).toHaveBeenCalledWith({ message: 'Removed from waitlist' });
    });

    test('returns 500 on error', async () => {
      Waitlist.remove.mockRejectedValue(new Error('fail'));
      const { req, res } = mockReqRes({ params: { id: 'w1' } });
      await waitlistController.removeFromWaitlist(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── confirmWaitlist ───────────────────────────────────
  describe('confirmWaitlist', () => {
    test('confirms waitlist and creates booking', async () => {
      // Mock pool.query for waitlist entry lookup and court price
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 'w1',
            user_id: 'user-1',
            court_id: 'c1',
            requested_date: '2025-06-01',
            preferred_time_slot: '10:00-12:00',
            status: 'NOTIFIED'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ price_per_hour: '200' }]
        });

      const booking = { id: 'b1', court_id: 'c1', total_amount: 400 };
      Booking.create.mockResolvedValue(booking);
      Waitlist.updateStatus.mockResolvedValue({});

      const { req, res } = mockReqRes({
        params: { id: 'w1' },
        body: { payment_method: 'PROMPTPAY' }
      });

      await waitlistController.confirmWaitlist(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Payment Successful! Booking confirmed.',
        booking
      });
      expect(Booking.create).toHaveBeenCalled();
      expect(paymentService.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          booking_id: 'b1',
          amount: 400,
          method: 'PROMPTPAY'
        })
      );
      expect(Waitlist.updateStatus).toHaveBeenCalledWith('w1', 'CONFIRMED');
    });

    test('returns 400 when waitlist entry not found/not NOTIFIED', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const { req, res } = mockReqRes({
        params: { id: 'w-invalid' },
        body: { payment_method: 'CREDIT_CARD' }
      });

      await waitlistController.confirmWaitlist(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Valid notified waitlist entry not found'
      });
    });

    test('defaults to CREDIT_CARD if no payment_method', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 'w2',
            user_id: 'user-1',
            court_id: 'c1',
            requested_date: '2025-06-01',
            preferred_time_slot: '14:00-15:00',
            status: 'NOTIFIED'
          }]
        })
        .mockResolvedValueOnce({ rows: [{ price_per_hour: '100' }] });

      Booking.create.mockResolvedValue({ id: 'b2' });
      Waitlist.updateStatus.mockResolvedValue({});

      const { req, res } = mockReqRes({
        params: { id: 'w2' },
        body: {} // no payment_method
      });

      await waitlistController.confirmWaitlist(req, res);

      expect(Booking.create).toHaveBeenCalledWith(
        expect.objectContaining({ payment_method: 'CREDIT_CARD' })
      );
    });

    test('returns 500 on unexpected error', async () => {
      pool.query.mockRejectedValue(new Error('DB crash'));

      const { req, res } = mockReqRes({
        params: { id: 'w1' },
        body: { payment_method: 'PROMPTPAY' }
      });

      await waitlistController.confirmWaitlist(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB crash' });
    });
  });
});
