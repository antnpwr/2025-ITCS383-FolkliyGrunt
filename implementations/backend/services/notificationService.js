/**
 * Notification Service — Nodemailer (SMTP Email)
 * Sends email alerts when a waitlisted court becomes available.
 *
 * Person 3 (Booking) will call this when a booking is cancelled:
 *   const notificationService = require('../services/notificationService');
 *   await notificationService.notifyWaitlist(courtId, startTime, endTime);
 */
require('dotenv').config();
const nodemailer = require('nodemailer');
const Waitlist = require('../models/Waitlist');

// Create reusable SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const notificationService = {
  /**
   * Notify the next user in the waitlist when a court becomes available
   * @param {string} courtId - Court UUID
   * @param {Date} startTime - Available start time
   * @param {Date} endTime - Available end time
   * @returns {Promise<void>} Notified user or null if no one waiting
   */
  notifyWaitlist: async (courtId, startTime, endTime) => {
    const nextUser = await Waitlist.getNextInQueue(courtId);

    if (!nextUser) {
      return null; // No one in the queue
    }

    // Mark as notified in DB
    await Waitlist.markNotified(nextUser.id);

    // Send email via Nodemailer
    try {
      await transporter.sendMail({
        from: `"Badminton Court System" <${process.env.SMTP_USER}>`,
        to: nextUser.email,
        subject: '🏸 Court is Now Available! Book Now',
        html: `
          <h2>Good news, ${nextUser.full_name}!</h2>
          <p>A court you were waiting for is now available.</p>
          <p><strong>Time slot:</strong> ${startTime} - ${endTime}</p>
          <p>Log in to book before someone else does!</p>
        `
      });
    } catch (emailError) {
      console.error(`[NOTIFICATION] Email failed: ${emailError.message}`);
      // Don't throw — notification failure shouldn't block cancellation
    }

    return {
      notified: true,
      user_email: nextUser.email,
      user_name: nextUser.full_name,
      court_id: courtId,
      message: `A court is now available! Book now for ${startTime} - ${endTime}.`
    };
  },

  /**
   * Send a generic notification to a user
   * @param {string} userEmail - User email
   * @param {string} subject - Email subject
   * @param {string} message - Message content (HTML)
   */
  sendNotification: async (userEmail, subject, message) => {
    try {
      await transporter.sendMail({
        from: `"Badminton Court System" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: subject,
        html: message
      });
      return { sent: true, email: userEmail };
    } catch (error) {
      console.error(`[NOTIFICATION] Email failed: ${error.message}`);
      return { sent: false, email: userEmail, error: error.message };
    }
  }
};

module.exports = notificationService;
