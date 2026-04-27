const pool = require('../config/db');
const Profile = require('../models/Profile');

jest.mock('../config/db', () => ({
  query: jest.fn()
}));

describe('Profile Model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a profile', async () => {
    const mockProfile = { id: '1', full_name: 'Test' };
    pool.query.mockResolvedValue({ rows: [mockProfile] });

    const result = await Profile.create({ auth_id: 'a', full_name: 'Test', address: 'addr' });
    expect(result).toEqual(mockProfile);
    expect(pool.query).toHaveBeenCalled();
  });

  it('should find by auth id', async () => {
    const mockProfile = { id: '1', full_name: 'Test' };
    pool.query.mockResolvedValue({ rows: [mockProfile] });

    const result = await Profile.findByAuthId('a');
    expect(result).toEqual(mockProfile);
    expect(pool.query).toHaveBeenCalled();
  });

  it('should update disabled status', async () => {
    const mockProfile = { id: '1', is_disabled: true };
    pool.query.mockResolvedValue({ rows: [mockProfile] });

    const result = await Profile.updateDisabledStatus('a', true);
    expect(result.is_disabled).toBe(true);
    expect(pool.query).toHaveBeenCalled();
  });

  it('should find all profiles', async () => {
    const mockProfiles = [
      { auth_id: 'a1', full_name: 'Alice', role: 'CUSTOMER', is_disabled: false },
      { auth_id: 'a2', full_name: 'Bob', role: 'ADMIN', is_disabled: false }
    ];
    pool.query.mockResolvedValue({ rows: mockProfiles });

    const result = await Profile.findAll();
    expect(result).toEqual(mockProfiles);
    expect(result).toHaveLength(2);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY'));
  });

  it('findAll returns empty array when no profiles', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const result = await Profile.findAll();
    expect(result).toEqual([]);
  });

  it('findByAuthId returns undefined when user not found', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const result = await Profile.findByAuthId('nonexistent');
    expect(result).toBeUndefined();
  });

  it('create uses default CUSTOMER role', async () => {
    const mockProfile = { id: '2', full_name: 'Jane', role: 'CUSTOMER' };
    pool.query.mockResolvedValue({ rows: [mockProfile] });

    const result = await Profile.create({ auth_id: 'b', full_name: 'Jane', address: 'addr2' });
    expect(result.role).toBe('CUSTOMER');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT'),
      expect.arrayContaining(['b', 'Jane', 'addr2', 'CUSTOMER'])
    );
  });
});
