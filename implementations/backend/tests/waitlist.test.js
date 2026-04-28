const Waitlist = require('../models/Waitlist');

// Mock the database pool
jest.mock('../config/db', () => ({
  query: jest.fn()
}));
const pool = require('../config/db');

describe('Waitlist Model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('add() inserts a new waitlist entry', async () => {
    const mockEntry = {
      id: 'w1',
      user_id: 'u1',
      court_id: 'c1',
      requested_date: '2025-04-01',
      preferred_time_slot: '09:00-11:00',
      status: 'PENDING'
    };
    pool.query.mockResolvedValue({ rows: [mockEntry] });

    const result = await Waitlist.add({
      user_id: 'u1',
      court_id: 'c1',
      requested_date: '2025-04-01',
      preferred_time_slot: '09:00-11:00'
    });

    expect(result).toEqual(mockEntry);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('getNextInQueue() returns the oldest pending entry', async () => {
    const mockUser = {
      id: 'w1',
      user_id: 'u1',
      court_id: 'c1',
      email: 'test@test.com',
      full_name: 'Test User',
      status: 'PENDING'
    };
    pool.query.mockResolvedValue({ rows: [mockUser] });

    const result = await Waitlist.getNextInQueue('c1');
    expect(result).toEqual(mockUser);
    expect(result.email).toBe('test@test.com');
  });

  test('getNextInQueue() returns undefined when queue is empty', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const result = await Waitlist.getNextInQueue('c1');
    expect(result).toBeUndefined();
  });

  test('markNotified() updates status to NOTIFIED', async () => {
    const mockEntry = { id: 'w1', status: 'NOTIFIED' };
    pool.query.mockResolvedValue({ rows: [mockEntry] });

    const result = await Waitlist.markNotified('w1');
    expect(result.status).toBe('NOTIFIED');
  });

  test('findByUser() returns all entries for a user', async () => {
    const mockEntries = [
      { id: 'w1', court_name: 'Court A', status: 'PENDING' },
      { id: 'w2', court_name: 'Court B', status: 'NOTIFIED' }
    ];
    pool.query.mockResolvedValue({ rows: mockEntries });

    const result = await Waitlist.findByUser('u1');
    expect(result).toHaveLength(2);
  });

  test('expireOldEntries() expires past-date entries', async () => {
    const mockExpired = [{ id: 'w1', status: 'EXPIRED' }];
    pool.query.mockResolvedValue({ rows: mockExpired });

    const result = await Waitlist.expireOldEntries();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('EXPIRED');
  });

  test('remove() deletes a waitlist entry if user owns it', async () => {
    const mockEntry = { id: 'w1', user_id: 'u1' };
    pool.query.mockResolvedValue({ rows: [mockEntry] });

    const result = await Waitlist.remove('w1', 'u1');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM waitlist'),
      ['w1', 'u1']
    );
    expect(result).toEqual(mockEntry);
  });

  test('remove() returns undefined if entry not found or not owned', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const result = await Waitlist.remove('nonexistent', 'u1');
    expect(result).toBeUndefined();
  });
});
