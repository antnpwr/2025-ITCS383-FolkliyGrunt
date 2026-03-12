const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const paymentService = require('../services/paymentService');

// All payment routes require authentication
router.use(authMiddleware);

/**
 * GET /api/payments/config
 * Returns the Stripe publishable key for the frontend
 */
router.get('/config', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

/**
 * POST /api/payments/create-customer
 * Creates or retrieves the user's Stripe Customer
 */
router.post('/create-customer', async (req, res) => {
  try {
    const customerId = await paymentService.getOrCreateCustomer(
      req.user.id,
      req.user.email
    );
    res.json({ customerId });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payments/saved-cards
 * Returns the user's saved credit cards
 */
router.get('/saved-cards', async (req, res) => {
  try {
    const customerId = await paymentService.getOrCreateCustomer(
      req.user.id,
      req.user.email
    );
    const cards = await paymentService.getSavedCards(customerId);
    res.json({ cards });
  } catch (error) {
    console.error('Get saved cards error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments/setup-intent
 * Creates a Stripe Setup Intent for saving a new card
 */
router.post('/setup-intent', async (req, res) => {
  try {
    const customerId = await paymentService.getOrCreateCustomer(
      req.user.id,
      req.user.email
    );
    const { client_secret } = await paymentService.createSetupIntent(customerId);
    res.json({ clientSecret: client_secret });
  } catch (error) {
    console.error('Setup intent error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/payments/cards/:id
 * Deletes a saved card
 */
router.delete('/cards/:id', async (req, res) => {
  try {
    await paymentService.deletePaymentMethod(req.params.id);
    res.json({ message: 'Card removed successfully' });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments/create-intent
 * Creates a Payment Intent for a booking payment
 */
router.post('/create-intent', async (req, res) => {
  try {
    const { amount, booking_id, payment_method_id } = req.body;
    const customerId = await paymentService.getOrCreateCustomer(
      req.user.id,
      req.user.email
    );

    const result = await paymentService.createPaymentIntent({
      customerId,
      amount,
      booking_id,
      payment_method_id
    });

    res.json(result);
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
