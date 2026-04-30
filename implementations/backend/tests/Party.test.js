jest.mock('../config/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));
jest.mock('../models/PartyParticipant', () => ({
  exists: jest.fn(),
  countByParty: jest.fn(),
  add: jest.fn(),
}));

const pool = require('../config/db');
const Party = require('../models/Party');
const PartyParticipant = require('../models/PartyParticipant');

describe('Party model', () => {
  afterEach(() => jest.clearAllMocks());

  test('create inserts a new party', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 'party-1', title: 'Test Party' }] });
    const party = await Party.create({
      host_id: 'user-1',
      title: 'Test Party',
      game_name: 'Badminton',
      game_date_time: new Date('2026-05-01T10:00:00Z'),
      location: 'Court A',
      capacity: 4,
      description: 'Test description',
    });

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO parties'),
      expect.any(Array),
    );
    expect(party).toEqual({ id: 'party-1', title: 'Test Party' });
  });

  test('findById returns a detailed party', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 'party-2', host_name: 'Host A' }] });
    const party = await Party.findById('party-2');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT p.*, host.full_name AS host_name'),
      ['party-2'],
    );
    expect(party).toEqual({ id: 'party-2', host_name: 'Host A' });
  });

  test('listFeed returns open parties', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 'party-3' }] });
    const parties = await Party.listFeed();
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY CASE WHEN p.status ='));    
    expect(parties).toEqual([{ id: 'party-3' }]);
  });

  test('join throws when party is not found', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
    pool.connect.mockResolvedValue(client);
    PartyParticipant.exists.mockResolvedValue(null);

    await expect(Party.join('missing', 'user-1')).rejects.toThrow('Party not found');
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM parties WHERE id = $1 FOR UPDATE'),
      ['missing'],
    );
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  test('join throws when party is not open', async () => {
    const party = { id: 'party-4', status: 'CLOSED', capacity: 4 };
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [party] }),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValue(client);
    PartyParticipant.exists.mockResolvedValue(null);

    await expect(Party.join('party-4', 'user-1')).rejects.toThrow('Party is not open for joins');
    expect(client.query).toHaveBeenNthCalledWith(2,
      expect.stringContaining('SELECT * FROM parties WHERE id = $1 FOR UPDATE'),
      ['party-4'],
    );
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  test('join throws when user already joined', async () => {
    const party = { id: 'party-5', status: 'OPEN', capacity: 4 };
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [party] }),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValue(client);
    PartyParticipant.exists.mockResolvedValue({ id: 'pp-5' });

    await expect(Party.join('party-5', 'user-1')).rejects.toThrow(
      'User already joined this party',
    );
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  test('join updates party to full when capacity is reached', async () => {
    const party = { id: 'party-6', status: 'OPEN', capacity: 2 };
    const updatedParty = { id: 'party-6', status: 'FULL' };
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [party] })
        .mockResolvedValueOnce({ rows: [updatedParty] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };

    pool.connect.mockResolvedValue(client);
    PartyParticipant.exists.mockResolvedValue(null);
    PartyParticipant.countByParty.mockResolvedValue(1);
    PartyParticipant.add.mockResolvedValue({ id: 'pp-6', party_id: 'party-6', user_id: 'user-1' });

    const result = await Party.join('party-6', 'user-1');

    expect(result.participant_count).toBe(2);
    expect(result.party).toEqual(updatedParty);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });
});
