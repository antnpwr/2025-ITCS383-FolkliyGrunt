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
  processPayment: jest.fn().mockResolvedValue({
    success: true,
    transaction_id: "PP_MEMBERSHIP_123",
  }),
}));

const paymentService = require("../services/paymentService");

describe("Auth API Endpoints", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── Register ──────────────────────────────────────────
  describe("POST /api/auth/register", () => {
    it("should successfully register a new user", async () => {
      // Controller uses supabaseAdmin.auth.admin.createUser
      supabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "test-uuid-123", email: "test@example.com" } },
        error: null,
      });

      Profile.create.mockResolvedValue({
        id: "profile-uuid-123",
        auth_id: "test-uuid-123",
        full_name: "Test User",
        address: "123 Test St",
        role: "CUSTOMER",
        is_disabled: false,
      });

      const response = await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        password: "Password123!",
        full_name: "Test User",
        address: "123 Test St",
      });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("User registered successfully");
      expect(response.body.user.full_name).toBe("Test User");
    });

    it("should return 400 if Supabase admin createUser fails", async () => {
      supabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Password is too weak" },
      });

      const response = await request(app)
        .post("/api/auth/register")
        .send({ email: "test@example.com", password: "weak" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Password is too weak");
    });

    it("should return 400 if user object is null (no error message)", async () => {
      supabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const response = await request(app)
        .post("/api/auth/register")
        .send({ email: "fail@example.com", password: "Test1234!" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("User creation failed.");
    });

    it("should default role to CUSTOMER when no role specified", async () => {
      supabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "uuid-cust", email: "cust@test.com" } },
        error: null,
      });
      Profile.create.mockResolvedValue({ role: "CUSTOMER", full_name: "Cust" });

      const response = await request(app).post("/api/auth/register").send({
        email: "cust@test.com",
        password: "Pass123!",
        full_name: "Cust",
      });

      expect(response.status).toBe(201);
      expect(Profile.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: "CUSTOMER" }),
      );
    });

    it("should allow ADMIN role when explicitly specified", async () => {
      supabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "uuid-admin", email: "admin@test.com" } },
        error: null,
      });
      Profile.create.mockResolvedValue({ role: "ADMIN", full_name: "Admin" });

      const response = await request(app).post("/api/auth/register").send({
        email: "admin@test.com",
        password: "Pass123!",
        full_name: "Admin",
        role: "ADMIN",
      });

      expect(response.status).toBe(201);
      expect(Profile.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: "ADMIN" }),
      );
    });

    it("should return 500 if Profile.create throws", async () => {
      supabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "uuid-err", email: "err@test.com" } },
        error: null,
      });
      Profile.create.mockRejectedValue(new Error("DB down"));

      const response = await request(app).post("/api/auth/register").send({
        email: "err@test.com",
        password: "Pass123!",
        full_name: "Err",
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe(
        "Internal server error during registration",
      );
    });
  });

  // ── Login ────────────────────────────────────────────
  describe("POST /api/auth/login", () => {
    it("should successfully login a valid user", async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: "test-uuid-123", email: "test@example.com" },
          session: { access_token: "valid-jwt-token" },
        },
        error: null,
      });

      Profile.findByAuthId.mockResolvedValue({ is_disabled: false });

      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com", password: "Password123!" });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Login successful");
      expect(response.body.session.access_token).toBe("valid-jwt-token");
    });

    it("should return 403 if user is disabled", async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: "disabled-uuid-123", email: "banned@example.com" },
          session: { access_token: "token" },
        },
        error: null,
      });

      Profile.findByAuthId.mockResolvedValue({ is_disabled: true });

      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "banned@example.com", password: "Password!" });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain("disabled");
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it("should return 400 when Supabase login fails", async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });

      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "wrong@example.com", password: "bad" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid login credentials");
    });

    it("should return 500 on unexpected login error", async () => {
      supabase.auth.signInWithPassword.mockRejectedValue(
        new Error("Network error"),
      );

      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com", password: "Pass123!" });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal server error during login");
    });
  });

  // ── Get Profile ──────────────────────────────────────
  describe("GET /api/auth/profile", () => {
    it("should get profile if valid token is provided", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "auth-uuid", email: "test@example.com" } },
        error: null,
      });

      Profile.findByAuthId.mockResolvedValue({
        full_name: "Test User",
        role: "CUSTOMER",
      });

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body.profile.full_name).toBe("Test User");
    });

    it("should return 401 if no token is provided", async () => {
      const response = await request(app).get("/api/auth/profile");

      expect(response.status).toBe(401);
    });

    it("should return member profile with active membership", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "auth-uuid", email: "member@example.com" } },
        error: null,
      });

      Profile.findByAuthId.mockResolvedValue({
        full_name: "Member User",
        role: "CUSTOMER",
        is_member: true,
        membership_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body.profile.is_member).toBe(true);
      expect(response.body.profile.membership.is_active).toBe(true);
    });

    it("should return member profile with expired membership", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "auth-uuid", email: "expired@example.com" } },
        error: null,
      });

      Profile.findByAuthId.mockResolvedValue({
        full_name: "Expired User",
        role: "CUSTOMER",
        is_member: true,
        membership_expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      });

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body.profile.membership.is_active).toBe(false);
    });
  });

  // ── Membership ───────────────────────────────────────
  describe("Membership Endpoints", () => {
    it("should return membership status for authenticated user", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "auth-uuid", email: "test@example.com" } },
        error: null,
      });

      Profile.findByAuthId.mockResolvedValue({
        role: "CUSTOMER",
        is_member: true,
        membership_expires_at: "2099-12-31T00:00:00Z",
      });

      Profile.getMembershipStatus.mockResolvedValue({
        is_member: true,
        is_active: true,
        membership_expires_at: "2099-12-31T00:00:00Z",
      });

      const response = await request(app)
        .get("/api/auth/membership/status")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body.monthly_fee_thb).toBe(199);
      expect(response.body.member_rate_thb_per_hour).toBe(150);
      expect(response.body.membership.is_active).toBe(true);
    });

    it("should subscribe membership and return transaction", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "auth-uuid", email: "test@example.com" } },
        error: null,
      });

      Profile.findByAuthId.mockResolvedValue({ role: "CUSTOMER" });
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
        .set("Authorization", "Bearer token")
        .send({ payment_method: "PROMPTPAY" });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Membership activated successfully");
      expect(response.body.charged_amount_thb).toBe(199);
      expect(response.body.member_rate_thb_per_hour).toBe(150);
      expect(response.body.transaction_id).toBe("PP_MEMBERSHIP_123");
      expect(paymentService.processPayment).toHaveBeenCalled();
    });
  });

  // ── Disable User (Admin Only) ────────────────────────
  describe("PUT /api/auth/users/:id/disable (Admin Only)", () => {
    it("should disable user if requester is admin", async () => {
      // Mock middleware auth
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-uuid", email: "admin@test.com" } },
        error: null,
      });
      Profile.findByAuthId.mockResolvedValue({ role: "ADMIN" });

      // Mock update
      Profile.updateDisabledStatus.mockResolvedValue({
        auth_id: "user-id",
        is_disabled: true,
      });

      const response = await request(app)
        .put("/api/auth/users/user-id/disable")
        .set("Authorization", "Bearer admin-token");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("User disabled successfully");
    });

    it("should return 403 if requester is not admin", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-uuid", email: "user@test.com" } },
        error: null,
      });
      Profile.findByAuthId.mockResolvedValue({ role: "CUSTOMER" });

      const response = await request(app)
        .put("/api/auth/users/other-id/disable")
        .set("Authorization", "Bearer user-token");

      expect(response.status).toBe(403);
    });

    it("should return 404 if user to disable is not found", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-uuid", email: "admin@test.com" } },
        error: null,
      });
      Profile.findByAuthId.mockResolvedValue({ role: "ADMIN" });
      Profile.updateDisabledStatus.mockResolvedValue(null);

      const response = await request(app)
        .put("/api/auth/users/nonexistent/disable")
        .set("Authorization", "Bearer admin-token");

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("User not found");
    });

    it("should return 500 on unexpected disable user error", async () => {
      // Mock middleware auth
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-uuid", email: "admin@test.com" } },
        error: null,
      });
      Profile.findByAuthId.mockResolvedValue({ role: "ADMIN" });

      Profile.updateDisabledStatus.mockRejectedValue(new Error("DB failure"));

      const response = await request(app)
        .put("/api/auth/users/user-id/disable")
        .set("Authorization", "Bearer admin-token");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal server error disabling user");
    });
  });

  // ── Get All Users (Admin Only) ────────────────────────
  describe("GET /api/auth/users (Admin Only)", () => {
    it("should get all users if requester is admin", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-uuid", email: "admin@test.com" } },
        error: null,
      });
      Profile.findByAuthId.mockResolvedValue({ role: "ADMIN" });

      Profile.findAll.mockResolvedValue([
        { id: 1, full_name: "Alice" },
        { id: 2, full_name: "Bob" },
      ]);

      const response = await request(app)
        .get("/api/auth/users")
        .set("Authorization", "Bearer admin-token");

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(2);
      expect(response.body.users[0].full_name).toBe("Alice");
    });

    it("should return 500 on unexpected Get All Users error", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-uuid", email: "admin@test.com" } },
        error: null,
      });
      Profile.findByAuthId.mockResolvedValue({ role: "ADMIN" });

      Profile.findAll.mockRejectedValue(new Error("DB connection failed"));

      const response = await request(app)
        .get("/api/auth/users")
        .set("Authorization", "Bearer admin-token");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal server error fetching users");
    });
  });
});
