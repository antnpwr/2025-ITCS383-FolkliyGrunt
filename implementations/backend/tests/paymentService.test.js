// Mock the stripe module with all needed sub-objects
const mockChargesCreate = jest.fn();
const mockRefundsCreate = jest.fn();
const mockCustomersCreate = jest.fn();
const mockCustomersCreateSource = jest.fn();
const mockPaymentMethodsList = jest.fn();
const mockPaymentMethodsDetach = jest.fn();
const mockPaymentIntentsCreate = jest.fn();
const mockSetupIntentsCreate = jest.fn();
const mockCheckoutSessionsCreate = jest.fn();

jest.mock("stripe", () => {
  return jest.fn(() => ({
    charges: { create: mockChargesCreate },
    refunds: { create: mockRefundsCreate },
    customers: {
      create: mockCustomersCreate,
      createSource: mockCustomersCreateSource,
    },
    paymentMethods: {
      list: mockPaymentMethodsList,
      detach: mockPaymentMethodsDetach,
    },
    paymentIntents: { create: mockPaymentIntentsCreate },
    setupIntents: { create: mockSetupIntentsCreate },
    checkout: { sessions: { create: mockCheckoutSessionsCreate } },
  }));
});

jest.mock("../config/db", () => ({
  query: jest.fn(),
}));

const pool = require("../config/db");
const paymentService = require("../services/paymentService");

describe("Payment Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChargesCreate.mockResolvedValue({
      id: "ch_test_123",
      amount: 50000,
      currency: "thb",
      status: "succeeded",
    });
    mockRefundsCreate.mockResolvedValue({
      id: "re_test_123",
      status: "succeeded",
    });
  });

  // ── processPayment ────────────────────────────────────
  describe("processPayment", () => {
    test("BANK_TRANSFER returns simulated transaction", async () => {
      const result = await paymentService.processPayment({
        booking_id: "b1",
        amount: 200,
        method: "BANK_TRANSFER",
        transfer_reference: "REF001",
      });
      expect(result.success).toBe(true);
      expect(result.transaction_id).toBe("REF_REF001");
      expect(result.method).toBe("BANK_TRANSFER");
    });

    test("PROMPTPAY returns simulated transaction", async () => {
      const result = await paymentService.processPayment({
        booking_id: "b2",
        amount: 100,
        method: "PROMPTPAY",
      });
      expect(result.success).toBe(true);
      expect(result.transaction_id).toMatch(/^PP_/);
    });

    test("CREDIT_CARD with customer_id uses Payment Intent", async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: "pi_test_123",
        client_secret: "pi_secret",
        status: "requires_payment_method",
      });

      const result = await paymentService.processPayment({
        booking_id: "b3",
        amount: 500,
        method: "CREDIT_CARD",
        customer_id: "cus_test",
      });
      expect(result.success).toBe(true);
      expect(result.transaction_id).toBe("pi_test_123");
    });

    test("CREDIT_CARD without customer_id returns simulated transaction", async () => {
      const result = await paymentService.processPayment({
        booking_id: "b4",
        amount: 300,
        method: "CREDIT_CARD",
        credit_card_token: "tok_visa",
      });
      expect(result.success).toBe(true);
      expect(result.transaction_id).toMatch(/^CC_/);
      // Simulated path — does NOT call Stripe Charges API
      expect(mockChargesCreate).not.toHaveBeenCalled();
    });

    test("CREDIT_CARD with customer_id throws on Stripe PaymentIntent error", async () => {
      mockPaymentIntentsCreate.mockRejectedValue(new Error("Card declined"));

      await expect(
        paymentService.processPayment({
          booking_id: "b5",
          amount: 500,
          method: "CREDIT_CARD",
          customer_id: "cus_test",
          credit_card_token: "tok_bad",
        }),
      ).rejects.toThrow("Payment failed: Card declined");
    });
  });

  // ── processRefund ─────────────────────────────────────
  describe("processRefund", () => {
    test("refunds a Bank Transfer transaction (simulated)", async () => {
      const result = await paymentService.processRefund("BT_ABC123");
      expect(result.success).toBe(true);
      expect(result.refund_id).toBe("RE_BT_ABC123");
    });

    test("refunds a PromptPay transaction (simulated)", async () => {
      const result = await paymentService.processRefund("PP_XYZ789");
      expect(result.success).toBe(true);
      expect(result.refund_id).toBe("RE_PP_XYZ789");
    });

    test("refunds a Payment Intent (pi_xxx)", async () => {
      const result = await paymentService.processRefund("pi_test_456");
      expect(result.success).toBe(true);
      expect(mockRefundsCreate).toHaveBeenCalledWith({
        payment_intent: "pi_test_456",
      });
    });

    test("refunds a legacy Charge (ch_xxx)", async () => {
      const result = await paymentService.processRefund("ch_test_789");
      expect(result.success).toBe(true);
      expect(mockRefundsCreate).toHaveBeenCalledWith({ charge: "ch_test_789" });
    });

    test("throws on Stripe refund error", async () => {
      mockRefundsCreate.mockRejectedValue(new Error("No such charge"));
      await expect(paymentService.processRefund("ch_invalid")).rejects.toThrow(
        "Refund failed: No such charge",
      );
    });
  });

  // ── getOrCreateCustomer ───────────────────────────────
  describe("getOrCreateCustomer", () => {
    test("returns existing customer ID from database", async () => {
      pool.query.mockResolvedValue({
        rows: [{ stripe_customer_id: "cus_existing" }],
      });

      const result = await paymentService.getOrCreateCustomer(
        "auth-1",
        "user@test.com",
      );
      expect(result).toBe("cus_existing");
      expect(mockCustomersCreate).not.toHaveBeenCalled();
    });

    test("creates new customer if none exists", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ stripe_customer_id: null }] }) // SELECT
        .mockResolvedValueOnce({ rows: [] }); // UPDATE
      mockCustomersCreate.mockResolvedValue({ id: "cus_new_123" });

      const result = await paymentService.getOrCreateCustomer(
        "auth-2",
        "new@test.com",
      );
      expect(result).toBe("cus_new_123");
      expect(mockCustomersCreate).toHaveBeenCalledWith({
        email: "new@test.com",
        metadata: { supabase_auth_id: "auth-2" },
      });
    });
  });

  // ── getSavedCards ──────────────────────────────────────
  describe("getSavedCards", () => {
    test("returns mapped card list", async () => {
      mockPaymentMethodsList.mockResolvedValue({
        data: [
          {
            id: "pm_1",
            card: {
              brand: "visa",
              last4: "4242",
              exp_month: 12,
              exp_year: 2026,
            },
          },
        ],
      });

      const cards = await paymentService.getSavedCards("cus_test");
      expect(cards).toEqual([
        {
          id: "pm_1",
          brand: "visa",
          last4: "4242",
          exp_month: 12,
          exp_year: 2026,
        },
      ]);
    });
  });

  // ── createSetupIntent ─────────────────────────────────
  describe("createSetupIntent", () => {
    test("returns client_secret", async () => {
      mockSetupIntentsCreate.mockResolvedValue({
        client_secret: "seti_secret_test",
      });

      const result = await paymentService.createSetupIntent("cus_test");
      expect(result.client_secret).toBe("seti_secret_test");
    });
  });

  // ── deletePaymentMethod ───────────────────────────────
  describe("deletePaymentMethod", () => {
    test("detaches payment method", async () => {
      mockPaymentMethodsDetach.mockResolvedValue({});

      const result = await paymentService.deletePaymentMethod("pm_test");
      expect(result.success).toBe(true);
      expect(mockPaymentMethodsDetach).toHaveBeenCalledWith("pm_test");
    });
  });

  // ── createCheckoutSession ─────────────────────────────
  describe("createCheckoutSession", () => {
    test("creates Stripe Checkout session", async () => {
      mockCheckoutSessionsCreate.mockResolvedValue({
        id: "cs_test_123",
        url: "https://checkout.stripe.com/pay/cs_test_123",
      });

      const session = await paymentService.createCheckoutSession({
        customerId: "cus_test",
        amount: 200,
        booking_id: "b1",
        court_name: "Court A",
        success_url: "http://localhost:8080/success",
        cancel_url: "http://localhost:8080/cancel",
      });

      expect(session.id).toBe("cs_test_123");
      expect(session.url).toContain("checkout.stripe.com");
      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_test",
          mode: "payment",
        }),
      );
    });
  });
});
