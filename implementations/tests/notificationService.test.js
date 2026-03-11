// Mock nodemailer BEFORE requiring the service
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: mockSendMail
  })
}));

jest.mock('../models/Waitlist', () => ({
  getNextInQueue: jest.fn(),
  markNotified: jest.fn()
}));
const Waitlist = require('../models/Waitlist');

const notificationService = require('../services/notificationService');

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
  });

  test('notifyWaitlist notifies next user in queue', async () => {
    Waitlist.getNextInQueue.mockResolvedValue({
      id: 'w1', email: 'test@test.com', full_name: 'Test User'
    });
    Waitlist.markNotified.mockResolvedValue({});

    const result = await notificationService.notifyWaitlist('court-1', '10:00', '12:00');
    expect(result.notified).toBe(true);
    expect(result.user_email).toBe('test@test.com');
    expect(Waitlist.markNotified).toHaveBeenCalledWith('w1');
  });

  test('notifyWaitlist returns null when queue is empty', async () => {
    Waitlist.getNextInQueue.mockResolvedValue(null);
    const result = await notificationService.notifyWaitlist('court-1', '10:00', '12:00');
    expect(result).toBeNull();
  });

  test('notifyWaitlist still returns result when email fails', async () => {
    Waitlist.getNextInQueue.mockResolvedValue({
      id: 'w2', email: 'fail@test.com', full_name: 'Fail User'
    });
    Waitlist.markNotified.mockResolvedValue({});
    mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const result = await notificationService.notifyWaitlist('court-1', '14:00', '16:00');

    expect(result.notified).toBe(true);
    expect(result.user_email).toBe('fail@test.com');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('sendNotification sends email successfully', async () => {
    const result = await notificationService.sendNotification(
      'user@test.com', 'Test Subject', '<p>Hello</p>'
    );
    expect(result.sent).toBe(true);
    expect(result.email).toBe('user@test.com');
  });

  test('sendNotification returns failure when email fails', async () => {
    mockSendMail.mockRejectedValue(new Error('Auth failed'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const result = await notificationService.sendNotification(
      'user@test.com', 'Test Subject', '<p>Hello</p>'
    );

    expect(result.sent).toBe(false);
    expect(result.error).toBe('Auth failed');
    consoleSpy.mockRestore();
  });
});
