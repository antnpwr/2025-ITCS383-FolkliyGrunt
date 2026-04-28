const { supabase, supabaseAdmin } = require("../config/supabase");
const Profile = require("../models/Profile");
const paymentService = require("../services/paymentService");

const MEMBERSHIP_MONTHLY_FEE = 199;

exports.register = async (req, res) => {
  const { email, password, full_name, address, role } = req.body;
  const userRole = role === "ADMIN" ? "ADMIN" : "CUSTOMER";

  try {
    // 1. Create user in Supabase Auth (using Admin Auth to bypass rate limits)
    let authData, authError;

    // Use admin client to skip email confirmation and rate limits for quick testing
    const result = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    authData = result.data;
    authError = result.error;

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const { user } = authData;

    if (!user) {
      return res.status(400).json({ error: "User creation failed." });
    }

    // 2. Create user profile in our database
    const rows = await Profile.create({
      auth_id: user.id,
      full_name,
      address,
      role: userRole,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: rows,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res
      .status(500)
      .json({ error: "Internal server error during registration" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // 2. Check if user is disabled in our profiles table
    const profile = await Profile.findByAuthId(data.user.id);

    if (profile?.is_disabled) {
      // Optional: Sign out immediately if disabled
      await supabase.auth.signOut();
      return res
        .status(403)
        .json({ error: "Account is disabled. Please contact support." });
    }

    res.status(200).json({
      message: "Login successful",
      session: data.session,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error during login" });
  }
};

exports.getProfile = async (req, res) => {
  try {
    // req.user is populated by authMiddleware
    // Flatten the response: combine Supabase user info with our profile table info
    const fullProfile = {
      ...req.user.profile, // id, auth_id, full_name, address, role, etc.
      email: req.user.email,
      membership: {
        is_member: Boolean(req.user.profile?.is_member),
        membership_started_at: req.user.profile?.membership_started_at || null,
        membership_expires_at: req.user.profile?.membership_expires_at || null,
        is_active:
          Boolean(req.user.profile?.is_member) &&
          Boolean(req.user.profile?.membership_expires_at) &&
          new Date(req.user.profile.membership_expires_at) > new Date(),
      },
    };
    res.status(200).json({ profile: fullProfile });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error fetching profile" });
  }
};

exports.disableUser = async (req, res) => {
  const { id } = req.params; // This will be the profile id or auth_id depending on how it's called

  try {
    // Assuming ID is the auth_id for simplicity, adjust query if it's the profile ID
    const profile = await Profile.updateDisabledStatus(id, true);

    if (!profile) {
      return res.status(404).json({ error: "User not found" });
    }

    // Optional: Use Supabase Admin to force logout / disable on Supabase side too
    // await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: '87600h' });

    res.status(200).json({
      message: "User disabled successfully",
      profile: profile,
    });
  } catch (error) {
    console.error("Disable user error", error);
    res.status(500).json({ error: "Internal server error disabling user" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await Profile.findAll();
    res.status(200).json({ users });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ error: "Internal server error fetching users" });
  }
};

exports.getMembershipStatus = async (req, res) => {
  try {
    const membership = await Profile.getMembershipStatus(req.user.id);
    if (!membership) {
      return res.status(404).json({ error: "Profile not found" });
    }

    return res.status(200).json({
      monthly_fee_thb: MEMBERSHIP_MONTHLY_FEE,
      member_rate_thb_per_hour: 150,
      membership,
    });
  } catch (error) {
    console.error("Get membership status error:", error);
    return res
      .status(500)
      .json({ error: "Internal server error fetching membership status" });
  }
};

exports.subscribeMembership = async (req, res) => {
  try {
    const paymentMethod = req.body?.payment_method || "PROMPTPAY";
    const transferReference = req.body?.transfer_reference;

    if (!["BANK_TRANSFER", "PROMPTPAY"].includes(paymentMethod)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    const paymentResult = await paymentService.processPayment({
      booking_id: `membership-${req.user.id}-${Date.now()}`,
      amount: MEMBERSHIP_MONTHLY_FEE,
      method: paymentMethod,
      transfer_reference: transferReference,
    });

    const updatedProfile = await Profile.activateMembership(req.user.id, {
      paidAmount: MEMBERSHIP_MONTHLY_FEE,
      paymentMethod,
      transactionId: paymentResult.transaction_id,
    });

    if (!updatedProfile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const membership = await Profile.getMembershipStatus(req.user.id);
    return res.status(200).json({
      message: "Membership activated successfully",
      charged_amount_thb: MEMBERSHIP_MONTHLY_FEE,
      member_rate_thb_per_hour: 150,
      transaction_id: paymentResult.transaction_id,
      membership,
    });
  } catch (error) {
    console.error("Subscribe membership error:", error);
    return res
      .status(500)
      .json({ error: "Internal server error subscribing membership" });
  }
};
