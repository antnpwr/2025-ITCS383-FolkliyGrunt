const Court = require('../models/Court');

// Mock the database pool
jest.mock('../config/db', () => ({
  query: jest.fn()
}));
const pool = require('../config/db');

describe('Court Model', () => {
  afterEach(() => jest.clearAllMocks());

  test('searchByName should find courts by name', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: '1', name: 'Bangkok Court' }] });
    const result = await Court.searchByName('Bangkok');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('ILIKE'),
      ['%Bangkok%']
    );
    expect(result).toHaveLength(1);
  });

  test('searchByPrice should filter by max price', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: '1', price_per_hour: 150 }] });
    const result = await Court.searchByPrice(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('price_per_hour <= $1'),
      [200]
    );
    expect(result).toHaveLength(1);
  });

  test('updateStatus should change court status', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: '1', current_status: 'RENOVATE' }] });
    const result = await Court.updateStatus('1', 'RENOVATE');
    expect(result.current_status).toBe('RENOVATE');
  });

  test('searchByDistance should find courts within radius', async () => {
    pool.query.mockResolvedValue({
      rows: [{ id: '1', name: 'Court A', distance_km: 3.5 }]
    });
    const result = await Court.searchByDistance(13.7, 100.5, 10);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('acos'),
      [13.7, 100.5, 10]
    );
    expect(result).toHaveLength(1);
    expect(result[0].distance_km).toBe(3.5);
  });

  test('findById should return a single court with avg_rating and review_count', async () => {
    pool.query.mockResolvedValue({
      rows: [{ id: '1', name: 'Court A', avg_rating: 4.5, review_count: 10 }]
    });
    const result = await Court.findById('1');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('review_count'),
      ['1']
    );
    expect(result.avg_rating).toBe(4.5);
    expect(result.review_count).toBe(10);
  });

  test('findAll should return only AVAILABLE courts', async () => {
    pool.query.mockResolvedValue({
      rows: [
        { id: '1', name: 'Court A', current_status: 'AVAILABLE' },
        { id: '2', name: 'Court B', current_status: 'AVAILABLE' }
      ]
    });
    const result = await Court.findAll();
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("current_status = 'AVAILABLE'")
    );
    expect(result).toHaveLength(2);
  });

  test('create should insert a new court and return it', async () => {
    const newCourt = {
      id: 'new-uuid',
      name: 'New Court',
      location_lat: 13.7,
      location_lng: 100.5,
      price_per_hour: 200,
      allowed_shoes: 'non-marking',
      opening_time: '08:00',
      closing_time: '22:00'
    };
    pool.query.mockResolvedValue({ rows: [newCourt] });
    const result = await Court.create(newCourt);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO courts'),
      ['New Court', 13.7, 100.5, 200, 'non-marking', '08:00', '22:00']
    );
    expect(result.name).toBe('New Court');
  });
});
