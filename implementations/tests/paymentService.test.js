// Mock the stripe module
const mockChargesCreate = jest.fn();
const mockRefundsCreate = jest.fn();
jest.mock('stripe', () => {
  return jest.fn(() => ({
    charges: { create: mockChargesCreate },
    refunds: { create: mockRefundsCreate }
  }));
});

const paymentService = require('../services/paymentService');

describe('Payment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChargesCreate.mockResolvedValue({
      id: 'ch_test_123',
      amount: 50000,
      currency: 'thb',
      status: 'succeeded'
    });
    mockRefundsCreate.mockResolvedValue({
      id: 're_test_123',
      status: 'succeeded'
    });
  });

  test('processPayment returns transaction_id on success', async () => {
    const result = await paymentService.processPayment({
      booking_id: 'test-booking-123',
      amount: 500,
      method: 'CREDIT_CARD',
      credit_card_token: 'tok_test_123'
    });
    expect(result.success).toBe(true);
    expect(result.transaction_id).toBe('ch_test_123');
    expect(result.amount).toBe(500);
  });

  test('processPayment throws on Stripe error', async () => {
    mockChargesCreate.mockRejectedValue(new Error('Card declined'));

    await expect(paymentService.processPayment({
      booking_id: 'test-booking-456',
      amount: 500,
      method: 'CREDIT_CARD',
      credit_card_token: 'tok_chargeDeclined'
    })).rejects.toThrow('Payment failed: Card declined');
  });

  test('processRefund returns refund_id', async () => {
    const result = await paymentService.processRefund('ch_test_123');
    expect(result.success).toBe(true);
    expect(result.refund_id).toBe('re_test_123');
  });

  test('processRefund throws on Stripe error', async () => {
    mockRefundsCreate.mockRejectedValue(new Error('No such charge'));

    await expect(paymentService.processRefund('ch_invalid'))
      .rejects.toThrow('Refund failed: No such charge');
  });
});
