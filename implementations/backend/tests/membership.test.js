const request = require("supertest");
const app = require("../server");
const { supabase, supabaseAdmin } = require("../config/supabase");
const Profile = require("../models/Profile");

// Mock dependencies
jest.mock("../config/supabase", () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
  },
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: jest.fn(),
        updateUserById: jest.fn(),
      },
    },
  },
}));

jest.mock("../models/Profile", () => ({
  create: jest.fn(),
  findByAuthId: jest.fn(),
  updateDisabledStatus: jest.fn(),
  findAll: jest.fn(),
  getMembershipStatus: jest.fn(),
  activateMembership: jest.fn(),
}));

jest.mock("../services/paymentService", () => ({
  processPayment: jest.fn(),
}));

const paymentService = require("../services/paymentService");

// Helper to set up authenticated user
const mockAuthUser = (userId = "auth-uuid", email = "test@example.com") => {
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: userId, email } },
    error: null,
  });
  Profile.findByAuthId.mockResolvedValue({
    auth_id: userId,
    role: "CUSTOMER",
    is_disabled: false,
  });
};

describe("Membership Discount System", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── GET /api/auth/membership/status ─────────────────────
  describe("GET /api/auth/membership/status", () => {
    it("should return active membership status for authenticated member", async () => {
      mockAuthUser();
      Profile.getMembershipStatus.mockResolvedValue({
        is_member: true,
        is_active: true,
        membership_started_at: "2025-01-01T00:00:00Z",
        membership_expires_at: "2025-12-31T23:59:59Z",
      });

      const response = await request(app)
        .get("/api/auth/membership/status")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.monthly_fee_thb).toBe(199);
      expect(response.body.member_rate_thb_per_hour).toBe(150);
      expect(response.body.membership.is_member).toBe(true);
      expect(response.body.membership.is_active).toBe(true);
      expect(response.body.membership.membership_expires_at).toBe(
        "2025-12-31T23:59:59Z",
      );
    });

    it("should return inactive membership for non-member user", async () => {
      mockAuthUser();
      Profile.getMembershipStatus.mockResolvedValue({
        is_member: false,
        is_active: false,
        membership_started_at: null,
        membership_expires_at: null,
      });

      const response = await request(app)
        .get("/api/auth/membership/status")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.membership.is_member).toBe(false);
      expect(response.body.membership.is_active).toBe(false);
    });

    it("should return expired membership status when membership has lapsed", async () => {
      mockAuthUser();
      Profile.getMembershipStatus.mockResolvedValue({
        is_member: true,
        is_active: false,
        membership_started_at: "2024-01-01T00:00:00Z",
        membership_expires_at: "2024-02-01T00:00:00Z",
      });

      const response = await request(app)
        .get("/api/auth/membership/status")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.membership.is_member).toBe(true);
      expect(response.body.membership.is_active).toBe(false);
    });

    it("should return 401 when no token is provided", async () => {
      const response = await request(app).get("/api/auth/membership/status");

      expect(response.status).toBe(401);
    });

    it("should return 404 when profile is not found", async () => {
      mockAuthUser();
      Profile.getMembershipStatus.mockResolvedValue(null);

      const response = await request(app)
        .get("/api/auth/membership/status")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Profile not found");
    });

    it("should return 500 on database error", async () => {
      mockAuthUser();
      Profile.getMembershipStatus.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const response = await request(app)
        .get("/api/auth/membership/status")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe(
        "Internal server error fetching membership status",
      );
    });
  });

  // ── POST /api/auth/membership/subscribe ──────────────────
  describe("POST /api/auth/membership/subscribe", () => {
    it("should successfully subscribe with PROMPTPAY payment method", async () => {
      mockAuthUser();

      paymentService.processPayment.mockResolvedValue({
        success: true,
        transaction_id: "PP_MEMBERSHIP_001",
      });

      Profile.activateMembership.mockResolvedValue({
        auth_id: "auth-uuid",
        is_member: true,
        membership_expires_at: "2025-12-31T23:59:59Z",
      });

      Profile.getMembershipStatus.mockResolvedValue({
        is_member: true,
        is_active: true,
        membership_expires_at: "2025-12-31T23:59:59Z",
      });

      const response = await request(app)
        .post("/api/auth/membership/subscribe")
        .set("Authorization", "Bearer valid-token")
        .send({ payment_method: "PROMPTPAY" });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Membership activated successfully");
      expect(response.body.charged_amount_thb).toBe(199);
      expect(response.body.member_rate_thb_per_hour).toBe(150);
      expect(response.body.transaction_id).toBe("PP_MEMBERSHIP_001");
      expect(response.body.membership.is_active).toBe(true);
      expect(paymentService.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 199,
          method: "PROMPTPAY",
        }),
      );
    });

    it("should successfully subscribe with BANK_TRANSFER payment method", async () => {
      mockAuthUser();

      paymentService.processPayment.mockResolvedValue({
        success: true,
        transaction_id: "BT_MEMBERSHIP_002",
      });

      Profile.activateMembership.mockResolvedValue({
        auth_id: "auth-uuid",
        is_member: true,
      });

      Profile.getMembershipStatus.mockResolvedValue({
        is_member: true,
        is_active: true,
      });

      const response = await request(app)
        .post("/api/auth/membership/subscribe")
        .set("Authorization", "Bearer valid-token")
        .send({
          payment_method: "BANK_TRANSFER",
          transfer_reference: "REF12345",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Membership activated successfully");
      expect(response.body.transaction_id).toBe("BT_MEMBERSHIP_002");
      expect(paymentService.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "BANK_TRANSFER",
          transfer_reference: "REF12345",
        }),
      );
    });

    it("should default to PROMPTPAY when no payment method is specified", async () => {
      mockAuthUser();

      paymentService.processPayment.mockResolvedValue({
        success: true,
        transaction_id: "PP_DEFAULT_003",
      });

      Profile.activateMembership.mockResolvedValue({
        auth_id: "auth-uuid",
        is_member: true,
      });

      Profile.getMembershipStatus.mockResolvedValue({
        is_member: true,
        is_active: true,
      });

      const response = await request(app)
        .post("/api/auth/membership/subscribe")
        .set("Authorization", "Bearer valid-token")
        .send({});

      expect(response.status).toBe(200);
      expect(paymentService.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "PROMPTPAY",
        }),
      );
    });

    it("should return 400 for invalid payment method", async () => {
      mockAuthUser();

      const response = await request(app)
        .post("/api/auth/membership/subscribe")
        .set("Authorization", "Bearer valid-token")
        .send({ payment_method: "INVALID_METHOD" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid payment method");
      expect(paymentService.processPayment).not.toHaveBeenCalled();
    });

    it("should return 400 for CREDIT_CARD payment method (not supported for membership)", async () => {
      mockAuthUser();

      const response = await request(app)
        .post("/api/auth/membership/subscribe")
        .set("Authorization", "Bearer valid-token")
        .send({ payment_method: "CREDIT_CARD" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid payment method");
    });

    it("should return 401 when no token is provided", async () => {
      const response = await request(app)
        .post("/api/auth/membership/subscribe")
        .send({ payment_method: "PROMPTPAY" });

      expect(response.status).toBe(401);
    });

    it("should return 404 when profile is not found after activation", async () => {
      mockAuthUser();

      paymentService.processPayment.mockResolvedValue({
        success: true,
        transaction_id: "PP_404",
      });

      Profile.activateMembership.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/auth/membership/subscribe")
        .set("Authorization", "Bearer valid-token")
        .send({ payment_method: "PROMPTPAY" });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Profile not found");
    });

    it("should return 500 when payment service throws error", async () => {
      mockAuthUser();

      paymentService.processPayment.mockRejectedValue(
        new Error("Payment gateway unavailable"),
      );

      const response = await request(app)
        .post("/api/auth/membership/subscribe")
        .set("Authorization", "Bearer valid-token")
        .send({ payment_method: "PROMPTPAY" });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe(
        "Internal server error subscribing membership",
      );
    });

    it("should return 500 when activateMembership throws error", async () => {
      mockAuthUser();

      paymentService.processPayment.mockResolvedValue({
        success: true,
        transaction_id: "PP_ERR",
      });

      Profile.activateMembership.mockRejectedValue(
        new Error("Database write failed"),
      );

      const response = await request(app)
        .post("/api/auth/membership/subscribe")
        .set("Authorization", "Bearer valid-token")
        .send({ payment_method: "PROMPTPAY" });

      expect(response.status).toBe(500);
    });

    it("should pass correct booking_id format to payment service", async () => {
      mockAuthUser("user-abc-123", "member@test.com");

      paymentService.processPayment.mockResolvedValue({
        success: true,
        transaction_id: "PP_123",
      });

      Profile.activateMembership.mockResolvedValue({ is_member: true });
      Profile.getMembershipStatus.mockResolvedValue({ is_active: true });

      await request(app)
        .post("/api/auth/membership/subscribe")
        .set("Authorization", "Bearer valid-token")
        .send({ payment_method: "PROMPTPAY" });

      expect(paymentService.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          booking_id: expect.stringContaining("membership-user-abc-123-"),
          amount: 199,
        }),
      );
    });

    it("should pass transfer_reference to payment service for BANK_TRANSFER", async () => {
      mockAuthUser();

      paymentService.processPayment.mockResolvedValue({
        success: true,
        transaction_id: "BT_REF",
      });

      Profile.activateMembership.mockResolvedValue({ is_member: true });
      Profile.getMembershipStatus.mockResolvedValue({ is_active: true });

      await request(app)
        .post("/api/auth/membership/subscribe")
        .set("Authorization", "Bearer valid-token")
        .send({
          payment_method: "BANK_TRANSFER",
          transfer_reference: "TXN-98765",
        });

      expect(paymentService.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          transfer_reference: "TXN-98765",
        }),
      );
    });
  });

  // ── GET /api/auth/profile (membership fields) ────────────
  describe("GET /api/auth/profile - membership fields", () => {
    it("should include active membership info in profile", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "auth-uuid", email: "member@test.com" } },
        error: null,
      });

      Profile.findByAuthId.mockResolvedValue({
        full_name: "Member User",
        role: "CUSTOMER",
        is_member: true,
        membership_started_at: "2025-01-01T00:00:00Z",
        membership_expires_at: "2099-12-31T23:59:59Z",
      });

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body.profile.membership.is_member).toBe(true);
      expect(response.body.profile.membership.is_active).toBe(true);
      expect(
        response.body.profile.membership.membership_started_at,
      ).toBeTruthy();
    });

    it("should show inactive membership when is_member is false", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "auth-uuid", email: "nonmember@test.com" } },
        error: null,
      });

      Profile.findByAuthId.mockResolvedValue({
        full_name: "Non Member",
        role: "CUSTOMER",
        is_member: false,
        membership_started_at: null,
        membership_expires_at: null,
      });

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body.profile.membership.is_member).toBe(false);
      expect(response.body.profile.membership.is_active).toBe(false);
    });

    it("should show inactive membership when expired", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "auth-uuid", email: "expired@test.com" } },
        error: null,
      });

      Profile.findByAuthId.mockResolvedValue({
        full_name: "Expired Member",
        role: "CUSTOMER",
        is_member: true,
        membership_started_at: "2024-01-01T00:00:00Z",
        membership_expires_at: "2020-01-01T00:00:00Z",
      });

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body.profile.membership.is_member).toBe(true);
      expect(response.body.profile.membership.is_active).toBe(false);
    });

    it("should handle missing membership fields gracefully", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "auth-uuid", email: "minimal@test.com" } },
        error: null,
      });

      Profile.findByAuthId.mockResolvedValue({
        full_name: "Minimal User",
        role: "CUSTOMER",
        // No membership fields at all
      });

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body.profile.membership.is_member).toBe(false);
      expect(response.body.profile.membership.is_active).toBe(false);
      expect(response.body.profile.membership.membership_started_at).toBeNull();
      expect(response.body.profile.membership.membership_expires_at).toBeNull();
    });
  });
});
