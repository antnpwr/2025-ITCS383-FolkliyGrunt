const pool = require("../config/db");

class Profile {
  static async create({ auth_id, full_name, address, role = "CUSTOMER" }) {
    const query = `
      INSERT INTO profiles (auth_id, full_name, address, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [
      auth_id,
      full_name,
      address,
      role,
    ]);
    return rows[0];
  }

  static async findByAuthId(authId) {
    const query = "SELECT * FROM profiles WHERE auth_id = $1";
    const { rows } = await pool.query(query, [authId]);
    return rows[0];
  }

  static async updateDisabledStatus(authId, isDisabled) {
    const query =
      "UPDATE profiles SET is_disabled = $2 WHERE auth_id = $1 RETURNING *";
    const { rows } = await pool.query(query, [authId, isDisabled]);
    return rows[0];
  }

  static async findAll() {
    const query =
      "SELECT auth_id, full_name, role, is_disabled, created_at FROM profiles ORDER BY created_at DESC";
    const { rows } = await pool.query(query);
    return rows;
  }

  static async getMembershipStatus(authId) {
    const query = `
      SELECT
        COALESCE(is_member, FALSE) AS is_member,
        membership_started_at,
        membership_expires_at,
        (COALESCE(is_member, FALSE)
          AND membership_expires_at IS NOT NULL
          AND membership_expires_at > NOW()) AS is_active
      FROM profiles
      WHERE auth_id = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [authId]);
    return rows[0];
  }

  static async activateMembership(
    authId,
    { paidAmount, paymentMethod, transactionId },
  ) {
    const query = `
      UPDATE profiles
      SET
        is_member = TRUE,
        membership_started_at = COALESCE(membership_started_at, NOW()),
        membership_expires_at = CASE
          WHEN membership_expires_at IS NOT NULL AND membership_expires_at > NOW()
            THEN membership_expires_at + INTERVAL '1 month'
          ELSE NOW() + INTERVAL '1 month'
        END,
        membership_fee_last_paid = $2,
        membership_last_payment_method = $3,
        membership_last_transaction_id = $4
      WHERE auth_id = $1
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      authId,
      paidAmount,
      paymentMethod,
      transactionId,
    ]);
    return rows[0];
  }
}

module.exports = Profile;
