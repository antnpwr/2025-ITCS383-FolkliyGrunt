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
});
