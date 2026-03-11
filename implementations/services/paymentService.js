/**
 * Payment Service — Stripe Integration
 * Uses Stripe Charges API for payments and Stripe Refunds API for cancellations.
 *
 * Person 3 (Booking) will import this:
 *   const paymentService = require('../services/paymentService');
 *   await paymentService.processPayment({ ... });
 */
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const paymentService = {
  /**
   * Process a payment via Stripe
   * @param {Object} params
   * @param {string} params.booking_id - Booking UUID (stored as metadata)
   * @param {number} params.amount - Amount in THB (smallest unit = satang, so 500 THB = 50000)
   * @param {string} params.method - 'CREDIT_CARD' or 'BANK_TRANSFER'
   * @param {string} params.credit_card_token - Stripe token from frontend (tok_xxx)
   * @returns {Object} { success, transaction_id, amount, method }
   */
  processPayment: async ({ booking_id, amount, method, credit_card_token }) => {
    try {
      const charge = await stripe.charges.create({
        amount: Math.round(amount * 100), // Convert THB to satang
        currency: 'thb',
        source: credit_card_token, // tok_visa for testing
        description: `Booking ${booking_id}`,
        metadata: { booking_id, method }
      });

      return {
        success: true,
        transaction_id: charge.id, // ch_xxx
        amount,
        method,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Payment failed: ${error.message}`);
    }
  },

  /**
   * Process a full refund via Stripe Refunds API
   * @param {string} chargeId - Stripe charge ID (ch_xxx) from original payment
   * @returns {Object} { success, refund_id }
   */
  processRefund: async (chargeId) => {
    try {
      const refund = await stripe.refunds.create({
        charge: chargeId
      });

      return {
        success: true,
        refund_id: refund.id, // re_xxx
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Refund failed: ${error.message}`);
    }
  }
};

module.exports = paymentService;
