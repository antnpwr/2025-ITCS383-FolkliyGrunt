jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

const pool = require('../config/db');
const PartyParticipant = require('../models/PartyParticipant');

describe('PartyParticipant model', () => {
  afterEach(() => jest.clearAllMocks());

  test('add inserts a party participant', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 'pp-1', party_id: 'p1', user_id: 'u1' }] });
    const participant = await PartyParticipant.add({ party_id: 'p1', user_id: 'u1' });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO party_participants'),
      ['p1', 'u1'],
    );
    expect(participant).toEqual({ id: 'pp-1', party_id: 'p1', user_id: 'u1' });
  });

  test('exists returns row when participant exists', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 'pp-2' }] });
    const existing = await PartyParticipant.exists('p2', 'u2');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id FROM party_participants'),
      ['p2', 'u2'],
    );
    expect(existing).toEqual({ id: 'pp-2' });
  });

  test('countByParty returns count and defaults to zero', async () => {
    pool.query.mockResolvedValue({ rows: [{ count: 3 }] });
    const count = await PartyParticipant.countByParty('p3');
    expect(count).toBe(3);

    pool.query.mockResolvedValue({ rows: [] });
    const zeroCount = await PartyParticipant.countByParty('p3');
    expect(zeroCount).toBe(0);
  });

  test('findByUser returns joined party rows', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 'pp-3', party_id: 'p3' }] });
    const rows = await PartyParticipant.findByUser('u3');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT pp.*, p.title'),
      ['u3'],
    );
    expect(rows).toEqual([{ id: 'pp-3', party_id: 'p3' }]);
  });
});
