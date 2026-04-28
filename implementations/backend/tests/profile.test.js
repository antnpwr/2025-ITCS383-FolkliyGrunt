const pool = require("../config/db");
const Profile = require("../models/Profile");

jest.mock("../config/db", () => ({
  query: jest.fn(),
}));

describe("Profile Model", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create a profile", async () => {
    const mockProfile = { id: "1", full_name: "Test" };
    pool.query.mockResolvedValue({ rows: [mockProfile] });

    const result = await Profile.create({
      auth_id: "a",
      full_name: "Test",
      address: "addr",
    });
    expect(result).toEqual(mockProfile);
    expect(pool.query).toHaveBeenCalled();
  });

  it("should find by auth id", async () => {
    const mockProfile = { id: "1", full_name: "Test" };
    pool.query.mockResolvedValue({ rows: [mockProfile] });

    const result = await Profile.findByAuthId("a");
    expect(result).toEqual(mockProfile);
    expect(pool.query).toHaveBeenCalled();
  });

  it("should update disabled status", async () => {
    const mockProfile = { id: "1", is_disabled: true };
    pool.query.mockResolvedValue({ rows: [mockProfile] });

    const result = await Profile.updateDisabledStatus("a", true);
    expect(result.is_disabled).toBe(true);
    expect(pool.query).toHaveBeenCalled();
  });

  it("should find all profiles", async () => {
    const mockProfiles = [
      {
        auth_id: "a1",
        full_name: "Alice",
        role: "CUSTOMER",
        is_disabled: false,
      },
      { auth_id: "a2", full_name: "Bob", role: "ADMIN", is_disabled: false },
    ];
    pool.query.mockResolvedValue({ rows: mockProfiles });

    const result = await Profile.findAll();
    expect(result).toEqual(mockProfiles);
    expect(result).toHaveLength(2);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY"),
    );
  });

  it("findAll returns empty array when no profiles", async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const result = await Profile.findAll();
    expect(result).toEqual([]);
  });

  it("findByAuthId returns undefined when user not found", async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const result = await Profile.findByAuthId("nonexistent");
    expect(result).toBeUndefined();
  });

  it("create uses default CUSTOMER role", async () => {
    const mockProfile = { id: "2", full_name: "Jane", role: "CUSTOMER" };
    pool.query.mockResolvedValue({ rows: [mockProfile] });

    const result = await Profile.create({
      auth_id: "b",
      full_name: "Jane",
      address: "addr2",
    });
    expect(result.role).toBe("CUSTOMER");
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT"),
      expect.arrayContaining(["b", "Jane", "addr2", "CUSTOMER"]),
    );
  });

  // ── Membership Model Methods ──────────────────────
  describe("getMembershipStatus", () => {
    it("should return active membership status", async () => {
      pool.query.mockResolvedValue({
        rows: [
          {
            is_member: true,
            is_active: true,
            membership_started_at: "2025-01-01",
            membership_expires_at: "2025-12-31",
          },
        ],
      });

      const result = await Profile.getMembershipStatus("auth-123");
      expect(result.is_member).toBe(true);
      expect(result.is_active).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("is_member"),
        ["auth-123"],
      );
    });

    it("should return inactive membership when not a member", async () => {
      pool.query.mockResolvedValue({
        rows: [
          {
            is_member: false,
            is_active: false,
            membership_started_at: null,
            membership_expires_at: null,
          },
        ],
      });

      const result = await Profile.getMembershipStatus("auth-456");
      expect(result.is_member).toBe(false);
      expect(result.is_active).toBe(false);
    });

    it("should return undefined when profile not found", async () => {
      pool.query.mockResolvedValue({ rows: [] });
      const result = await Profile.getMembershipStatus("nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("activateMembership", () => {
    it("should activate membership for new member", async () => {
      const mockProfile = {
        auth_id: "auth-789",
        is_member: true,
        membership_started_at: "2025-06-01",
        membership_expires_at: "2025-07-01",
        membership_fee_last_paid: 199,
        membership_last_payment_method: "PROMPTPAY",
        membership_last_transaction_id: "TXN_001",
      };
      pool.query.mockResolvedValue({ rows: [mockProfile] });

      const result = await Profile.activateMembership("auth-789", {
        paidAmount: 199,
        paymentMethod: "PROMPTPAY",
        transactionId: "TXN_001",
      });

      expect(result.is_member).toBe(true);
      expect(result.membership_fee_last_paid).toBe(199);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE profiles"),
        ["auth-789", 199, "PROMPTPAY", "TXN_001"],
      );
    });

    it("should extend membership for existing member", async () => {
      const mockProfile = {
        auth_id: "auth-existing",
        is_member: true,
        membership_expires_at: "2025-08-01",
      };
      pool.query.mockResolvedValue({ rows: [mockProfile] });

      const result = await Profile.activateMembership("auth-existing", {
        paidAmount: 199,
        paymentMethod: "BANK_TRANSFER",
        transactionId: "TXN_002",
      });

      expect(result.is_member).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL"),
        expect.arrayContaining([
          "auth-existing",
          199,
          "BANK_TRANSFER",
          "TXN_002",
        ]),
      );
    });

    it("should return undefined when profile not found for activation", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await Profile.activateMembership("nonexistent", {
        paidAmount: 199,
        paymentMethod: "PROMPTPAY",
        transactionId: "TXN_003",
      });

      expect(result).toBeUndefined();
    });

    it("should use COALESCE for membership_started_at on first activation", async () => {
      pool.query.mockResolvedValue({
        rows: [{ auth_id: "new-member", is_member: true }],
      });

      await Profile.activateMembership("new-member", {
        paidAmount: 199,
        paymentMethod: "PROMPTPAY",
        transactionId: "TXN_004",
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("COALESCE(membership_started_at, NOW())"),
        expect.any(Array),
      );
    });
  });
});
