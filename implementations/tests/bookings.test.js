const Booking = require('../models/Booking');

jest.mock('../config/db', () => {
    const mockClient = {
        query: jest.fn(),
        release: jest.fn()
    };
    return {
        query: jest.fn(),
        connect: jest.fn().mockResolvedValue(mockClient)
    };
});
const pool = require('../config/db');

describe('Booking Model', () => {
    afterEach(() => jest.clearAllMocks());

    test('checkAvailability returns true for open slot', async () => {
        pool.query.mockResolvedValue({ rows: [] });
        const available = await Booking.checkAvailability('court-1', '2025-01-01 10:00', '2025-01-01 12:00');
        expect(available).toBe(true);
    });

    test('checkAvailability returns false for taken slot', async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 'booking-1' }] });
        const available = await Booking.checkAvailability('court-1', '2025-01-01 10:00', '2025-01-01 12:00');
        expect(available).toBe(false);
    });

    test('cancel returns null if booking not eligible', async () => {
        pool.query.mockResolvedValue({ rows: [] });
        const result = await Booking.cancel('booking-1', 'user-1');
        expect(result).toBeUndefined();
    });
});
