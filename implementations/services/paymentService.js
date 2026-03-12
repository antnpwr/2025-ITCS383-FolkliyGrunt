/**
 * Payment Service — Stripe Integration (Payment Intents + Customers)
 * 
 * Uses the modern Stripe Payment Intents API for SCA-compliant payments.
 * Supports Stripe Customers for saving credit cards.
 * Also handles bank transfer simulation and full refunds.
 */
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/db');

const paymentService = {
  // ─── Stripe Customer Management ───────────────────────────────────

  /**
   * Get or create a Stripe Customer for a user.
   * Links the Stripe customer_id back to the profiles table.
   * @param {string} authId - Supabase auth user ID
   * @param {string} email  - User email
   * @returns {string} Stripe customer ID (cus_xxx)
   */
  getOrCreateCustomer: async (authId, email) => {
    // Check if user already has a Stripe customer ID
    const { rows } = await pool.query(
      'SELECT stripe_customer_id FROM profiles WHERE auth_id = $1',
      [authId]
    );

    if (rows[0]?.stripe_customer_id) {
      return rows[0].stripe_customer_id;
    }

    // Create a new Stripe Customer
    const customer = await stripe.customers.create({
      email,
      metadata: { supabase_auth_id: authId }
    });

    // Save customer ID to profiles
    await pool.query(
      'UPDATE profiles SET stripe_customer_id = $1 WHERE auth_id = $2',
      [customer.id, authId]
    );

    return customer.id;
  },

  /**
   * Get saved payment methods (cards) for a customer
   * @param {string} customerId - Stripe customer ID
   * @returns {Array} List of saved cards
   */
  getSavedCards: async (customerId) => {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });

    return paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      exp_month: pm.card.exp_month,
      exp_year: pm.card.exp_year
    }));
  },

  /**
   * Create a Setup Intent to save a card for future use
   * @param {string} customerId - Stripe customer ID
   * @returns {Object} { client_secret }
   */
  createSetupIntent: async (customerId) => {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card']
    });

    return { client_secret: setupIntent.client_secret };
  },

  /**
   * Delete a saved payment method
   * @param {string} paymentMethodId - Stripe payment method ID (pm_xxx)
   */
  deletePaymentMethod: async (paymentMethodId) => {
    await stripe.paymentMethods.detach(paymentMethodId);
    return { success: true };
  },

  // ─── Payment Processing ───────────────────────────────────────────

  /**
   * Create a Payment Intent for a booking
   * @param {Object} params
   * @param {string} params.customerId - Stripe customer ID
   * @param {number} params.amount     - Amount in THB
   * @param {string} params.booking_id - Booking UUID (metadata)
   * @param {string} [params.payment_method_id] - Saved card pm_xxx (optional)
   * @returns {Object} { client_secret, payment_intent_id }
   */
  createPaymentIntent: async ({ customerId, amount, booking_id, payment_method_id }) => {
    const params = {
      amount: Math.round(amount * 100), // THB → satang
      currency: 'thb',
      customer: customerId,
      metadata: { booking_id },
      automatic_payment_methods: { enabled: true }
    };

    // If using a saved card, attach it and confirm immediately
    if (payment_method_id) {
      params.payment_method = payment_method_id;
      params.confirm = true;
      params.off_session = true;
    }

    const paymentIntent = await stripe.paymentIntents.create(params);

    return {
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status
    };
  },

  /**
   * Create a Stripe Checkout Session
   */
  createCheckoutSession: async ({ customerId, amount, booking_id, court_name, success_url, cancel_url }) => {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'thb',
            product_data: {
              name: `Court Booking - ${court_name}`,
              description: `Booking ID: ${booking_id}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url,
      cancel_url,
      client_reference_id: booking_id,
      saved_payment_method_options: { payment_method_save: 'enabled' }
    });
    return session;
  },

  /**
   * Process a payment (backward-compatible wrapper)
   * Used by bookingController for both credit card and bank transfer
   */
  processPayment: async ({ booking_id, amount, method, credit_card_token, transfer_reference, customer_id, payment_method_id }) => {
    try {
      // Bank transfer — simulated
      if (method === 'BANK_TRANSFER') {
        return {
          success: true,
          transaction_id: transfer_reference
            ? `REF_${transfer_reference}`
            : `BT_${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
          amount,
          method,
          timestamp: new Date().toISOString()
        };
      }

      // PromptPay — simulated
      if (method === 'PROMPTPAY') {
        return {
          success: true,
          transaction_id: `PP_${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
          amount,
          method,
          timestamp: new Date().toISOString()
        };
      }

      // Credit Card via Payment Intent (modern flow)
      if (customer_id) {
        const intent = await paymentService.createPaymentIntent({
          customerId: customer_id,
          amount,
          booking_id,
          payment_method_id
        });

        return {
          success: true,
          transaction_id: intent.payment_intent_id,
          client_secret: intent.client_secret,
          status: intent.status,
          amount,
          method,
          timestamp: new Date().toISOString()
        };
      }

      // Fallback: Legacy Charges API (for tok_visa test tokens)
      const charge = await stripe.charges.create({
        amount: Math.round(amount * 100),
        currency: 'thb',
        source: credit_card_token || 'tok_visa',
        description: `Booking ${booking_id}`,
        metadata: { booking_id, method }
      });

      return {
        success: true,
        transaction_id: charge.id,
        amount,
        method,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Payment failed: ${error.message}`);
    }
  },

  // ─── Refunds ──────────────────────────────────────────────────────

  /**
   * Process a full refund
   * @param {string} transactionId - Stripe charge/PI ID or simulated reference
   */
  processRefund: async (transactionId) => {
    try {
      // No transaction ID — nothing to refund (e.g. booking had no payment)
      if (!transactionId) {
        return {
          success: true,
          refund_id: 'NO_TXN',
          note: 'No transaction to refund',
          timestamp: new Date().toISOString()
        };
      }

      // Mock refund for bank transfers / PromptPay
      if (transactionId?.startsWith('BT_') || transactionId?.startsWith('REF_') || transactionId?.startsWith('PP_')) {
        return {
          success: true,
          refund_id: `RE_${transactionId}`,
          timestamp: new Date().toISOString()
        };
      }

      // Payment Intent refund (pi_xxx)
      if (transactionId?.startsWith('pi_')) {
        const refund = await stripe.refunds.create({
          payment_intent: transactionId
        });
        return {
          success: true,
          refund_id: refund.id,
          timestamp: new Date().toISOString()
        };
      }

      // Checkout Session refund (cs_xxx)
      if (transactionId?.startsWith('cs_')) {
        const session = await stripe.checkout.sessions.retrieve(transactionId);
        if (!session.payment_intent) {
          // Session exists but payment was never completed — skip refund
          return {
            success: true,
            refund_id: `SKIP_${transactionId.substring(0, 20)}`,
            note: 'Checkout session had no completed payment — no refund needed',
            timestamp: new Date().toISOString()
          };
        }
        const refund = await stripe.refunds.create({
          payment_intent: session.payment_intent
        });
        return {
          success: true,
          refund_id: refund.id,
          timestamp: new Date().toISOString()
        };
      }

      // Legacy Charges refund (ch_xxx)
      const refund = await stripe.refunds.create({
        charge: transactionId
      });

      return {
        success: true,
        refund_id: refund.id,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Refund failed: ${error.message}`);
    }
  }
};

module.exports = paymentService;
