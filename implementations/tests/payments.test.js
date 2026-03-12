/**
 * Tests for routes/payments.js
 * Covers: GET /config, POST /create-customer, GET /saved-cards,
 *         POST /setup-intent, DELETE /cards/:id, POST /create-intent
 */
const express = require('express');
const request = require('supertest');

// Mocks
jest.mock('../middleware/authMiddleware', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: 'user-123', email: 'test@example.com' };
    next();
  }
}));

jest.mock('../services/paymentService', () => ({
  getOrCreateCustomer: jest.fn(),
  getSavedCards: jest.fn(),
  createSetupIntent: jest.fn(),
  deletePaymentMethod: jest.fn(),
  createPaymentIntent: jest.fn()
}));

const paymentService = require('../services/paymentService');

// Build a mini express app that uses the payments router
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/payments', require('../routes/payments'));
  return app;
}

describe('Payments Routes', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_abc';
  });

  // ── GET /config ──────────────────────────────────────
  describe('GET /api/payments/config', () => {
    it('returns the publishable key', async () => {
      const res = await request(app).get('/api/payments/config');
      expect(res.status).toBe(200);
      expect(res.body.publishableKey).toBe('pk_test_abc');
    });
  });

  // ── POST /create-customer ────────────────────────────
  describe('POST /api/payments/create-customer', () => {
    it('returns customerId on success', async () => {
      paymentService.getOrCreateCustomer.mockResolvedValue('cus_xyz');
      const res = await request(app).post('/api/payments/create-customer');
      expect(res.status).toBe(200);
      expect(res.body.customerId).toBe('cus_xyz');
    });

    it('returns 500 on error', async () => {
      paymentService.getOrCreateCustomer.mockRejectedValue(new Error('Stripe down'));
      const res = await request(app).post('/api/payments/create-customer');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Stripe down');
    });
  });

  // ── GET /saved-cards ─────────────────────────────────
  describe('GET /api/payments/saved-cards', () => {
    it('returns saved cards on success', async () => {
      paymentService.getOrCreateCustomer.mockResolvedValue('cus_xyz');
      paymentService.getSavedCards.mockResolvedValue([{ id: 'pm_1', last4: '4242' }]);
      const res = await request(app).get('/api/payments/saved-cards');
      expect(res.status).toBe(200);
      expect(res.body.cards).toHaveLength(1);
      expect(res.body.cards[0].last4).toBe('4242');
    });

    it('returns 500 on error', async () => {
      paymentService.getOrCreateCustomer.mockRejectedValue(new Error('Cannot list cards'));
      const res = await request(app).get('/api/payments/saved-cards');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Cannot list cards');
    });
  });

  // ── POST /setup-intent ───────────────────────────────
  describe('POST /api/payments/setup-intent', () => {
    it('returns clientSecret on success', async () => {
      paymentService.getOrCreateCustomer.mockResolvedValue('cus_xyz');
      paymentService.createSetupIntent.mockResolvedValue({ client_secret: 'seti_secret_abc' });
      const res = await request(app).post('/api/payments/setup-intent');
      expect(res.status).toBe(200);
      expect(res.body.clientSecret).toBe('seti_secret_abc');
    });

    it('returns 500 on error', async () => {
      paymentService.getOrCreateCustomer.mockRejectedValue(new Error('Intent fail'));
      const res = await request(app).post('/api/payments/setup-intent');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Intent fail');
    });
  });

  // ── DELETE /cards/:id ────────────────────────────────
  describe('DELETE /api/payments/cards/:id', () => {
    it('returns success message', async () => {
      paymentService.deletePaymentMethod.mockResolvedValue(true);
      const res = await request(app).delete('/api/payments/cards/pm_123');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Card removed successfully');
    });

    it('returns 500 on error', async () => {
      paymentService.deletePaymentMethod.mockRejectedValue(new Error('Not found'));
      const res = await request(app).delete('/api/payments/cards/pm_123');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Not found');
    });
  });

  // ── POST /create-intent ──────────────────────────────
  describe('POST /api/payments/create-intent', () => {
    it('creates a payment intent on success', async () => {
      paymentService.getOrCreateCustomer.mockResolvedValue('cus_xyz');
      paymentService.createPaymentIntent.mockResolvedValue({
        client_secret: 'pi_secret_abc',
        payment_intent_id: 'pi_123',
        status: 'requires_confirmation'
      });
      const res = await request(app)
        .post('/api/payments/create-intent')
        .send({ amount: 200, booking_id: 'book-1', payment_method_id: 'pm_1' });
      expect(res.status).toBe(200);
      expect(res.body.payment_intent_id).toBe('pi_123');
    });

    it('returns 500 on error', async () => {
      paymentService.getOrCreateCustomer.mockRejectedValue(new Error('Payment error'));
      const res = await request(app)
        .post('/api/payments/create-intent')
        .send({ amount: 200, booking_id: 'book-1' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Payment error');
    });
  });
});
