// Mock the Waitlist model BEFORE requiring the controller
jest.mock('../models/Waitlist');
const Waitlist = require('../models/Waitlist');
const waitlistController = require('../controllers/waitlistController');

// Helper to create mock req/res
function mockReqRes(overrides = {}) {
  const req = {
    user: { id: 'user-1' },
    params: {},
    body: {},
    ...overrides
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return { req, res };
}

describe('waitlistController', () => {
  afterEach(() => jest.clearAllMocks());

  // ── addToWaitlist ─────────────────────────────────────
  describe('addToWaitlist', () => {
    test('adds entry and returns 201', async () => {
      const entry = { id: 'w1', court_id: 'c1', status: 'PENDING' };
      Waitlist.add.mockResolvedValue(entry);

      const { req, res } = mockReqRes({
        body: {
          court_id: 'c1',
          requested_date: '2025-04-01',
          preferred_time_slot: '09:00-11:00'
        }
      });

      await waitlistController.addToWaitlist(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(entry);
      expect(Waitlist.add).toHaveBeenCalledWith({
        user_id: 'user-1',
        court_id: 'c1',
        requested_date: '2025-04-01',
        preferred_time_slot: '09:00-11:00'
      });
    });

    test('returns 500 on error', async () => {
      Waitlist.add.mockRejectedValue(new Error('DB error'));

      const { req, res } = mockReqRes({
        body: { court_id: 'c1', requested_date: '2025-04-01' }
      });

      await waitlistController.addToWaitlist(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
    });
  });

  // ── getMyWaitlist ─────────────────────────────────────
  describe('getMyWaitlist', () => {
    test('returns user waitlist entries', async () => {
      const entries = [{ id: 'w1' }, { id: 'w2' }];
      Waitlist.findByUser.mockResolvedValue(entries);

      const { req, res } = mockReqRes();
      await waitlistController.getMyWaitlist(req, res);

      expect(res.json).toHaveBeenCalledWith(entries);
      expect(Waitlist.findByUser).toHaveBeenCalledWith('user-1');
    });

    test('returns 500 on error', async () => {
      Waitlist.findByUser.mockRejectedValue(new Error('fail'));

      const { req, res } = mockReqRes();
      await waitlistController.getMyWaitlist(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── removeFromWaitlist ────────────────────────────────
  describe('removeFromWaitlist', () => {
    test('returns removal message', async () => {
      const { req, res } = mockReqRes({ params: { id: 'w1' } });
      await waitlistController.removeFromWaitlist(req, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Removed from waitlist' });
    });
  });
});
