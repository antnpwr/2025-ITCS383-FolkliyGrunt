// Mock the Court model BEFORE requiring the controller
jest.mock('../models/Court');

const Court = require('../models/Court');
const courtController = require('../controllers/courtController');

// Helper to create mock req/res
function mockReqRes(overrides = {}) {
    const req = {
        user: { id: 'user-1', role: 'admin' },
        params: {},
        body: {},
        query: {},
        ...overrides
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
    };
    return { req, res };
}

describe('courtController', () => {
    afterEach(() => jest.clearAllMocks());

    // ── search ───────────────────────────────────────────
    describe('search', () => {
        test('searches by name when name query param is provided', async () => {
            const courts = [{ id: '1', name: 'Bangkok Court' }];
            Court.searchByName.mockResolvedValue(courts);

            const { req, res } = mockReqRes({ query: { name: 'Bangkok' } });
            await courtController.search(req, res);

            expect(Court.searchByName).toHaveBeenCalledWith('Bangkok');
            expect(res.json).toHaveBeenCalledWith(courts);
        });

        test('searches by distance when lat, lng, radius are provided', async () => {
            const courts = [{ id: '1', distance_km: 3.5 }];
            Court.searchByDistance.mockResolvedValue(courts);

            const { req, res } = mockReqRes({ query: { lat: '13.7', lng: '100.5', radius: '10' } });
            await courtController.search(req, res);

            expect(Court.searchByDistance).toHaveBeenCalledWith(13.7, 100.5, 10);
            expect(res.json).toHaveBeenCalledWith(courts);
        });

        test('searches by max price when maxPrice is provided', async () => {
            const courts = [{ id: '1', price_per_hour: 150 }];
            Court.searchByPrice.mockResolvedValue(courts);

            const { req, res } = mockReqRes({ query: { maxPrice: '200' } });
            await courtController.search(req, res);

            expect(Court.searchByPrice).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(courts);
        });

        test('returns all courts when no query params', async () => {
            const courts = [{ id: '1' }, { id: '2' }];
            Court.findAll.mockResolvedValue(courts);

            const { req, res } = mockReqRes({ query: {} });
            await courtController.search(req, res);

            expect(Court.findAll).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(courts);
        });

        test('returns 500 on error', async () => {
            Court.findAll.mockRejectedValue(new Error('DB error'));

            const { req, res } = mockReqRes({ query: {} });
            await courtController.search(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ── getAll ───────────────────────────────────────────
    describe('getAll', () => {
        test('returns all courts', async () => {
            const courts = [{ id: '1' }, { id: '2' }];
            Court.findAll.mockResolvedValue(courts);

            const { req, res } = mockReqRes();
            await courtController.getAll(req, res);

            expect(res.json).toHaveBeenCalledWith(courts);
        });

        test('returns 500 on error', async () => {
            Court.findAll.mockRejectedValue(new Error('fail'));

            const { req, res } = mockReqRes();
            await courtController.getAll(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ── getById ──────────────────────────────────────────
    describe('getById', () => {
        test('returns court when found', async () => {
            const court = { id: '1', name: 'Court A' };
            Court.findById.mockResolvedValue(court);

            const { req, res } = mockReqRes({ params: { id: '1' } });
            await courtController.getById(req, res);

            expect(res.json).toHaveBeenCalledWith(court);
        });

        test('returns 404 when court not found', async () => {
            Court.findById.mockResolvedValue(null);

            const { req, res } = mockReqRes({ params: { id: 'nonexistent' } });
            await courtController.getById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Court not found' });
        });

        test('returns 500 on error', async () => {
            Court.findById.mockRejectedValue(new Error('fail'));

            const { req, res } = mockReqRes({ params: { id: '1' } });
            await courtController.getById(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ── create ───────────────────────────────────────────
    describe('create', () => {
        const validBody = {
            name: 'New Court',
            location_lat: 13.7,
            location_lng: 100.5,
            price_per_hour: 200,
            allowed_shoes: 'non-marking',
            opening_time: '08:00',
            closing_time: '22:00'
        };

        test('creates court and returns 201', async () => {
            const court = { id: 'new-1', ...validBody };
            Court.create.mockResolvedValue(court);

            const { req, res } = mockReqRes({ body: validBody });
            await courtController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ message: 'Court created successfully', court });
        });

        test('creates court from address using Nominatim geocoding', async () => {
            const mockLocation = [{ lat: '14.0', lon: '101.0' }];
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    json: () => Promise.resolve(mockLocation)
                })
            );

            const bodyWithoutCoords = { ...validBody, address: 'Bangkok' };
            delete bodyWithoutCoords.location_lat;
            delete bodyWithoutCoords.location_lng;

            const court = { id: 'new-2', ...bodyWithoutCoords, location_lat: 14.0, location_lng: 101.0 };
            Court.create.mockResolvedValue(court);

            const { req, res } = mockReqRes({ body: bodyWithoutCoords });
            await courtController.create(req, res);

            expect(global.fetch).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(Court.create).toHaveBeenCalledWith(expect.objectContaining({ location_lat: 14.0, location_lng: 101.0 }));
        });

        test('returns 400 when required fields are missing', async () => {
            const { req, res } = mockReqRes({ body: { name: 'Test' } });
            await courtController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Missing required fields: name, location_lat (or address), location_lng, price_per_hour, opening_time, closing_time'
            });
        });

        test('returns 500 on error', async () => {
            Court.create.mockRejectedValue(new Error('DB error'));

            const { req, res } = mockReqRes({ body: validBody });
            await courtController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ── update ───────────────────────────────────────────
    describe('update', () => {
        test('updates court and returns success', async () => {
            const court = { id: '1', name: 'Updated' };
            Court.update.mockResolvedValue(court);

            const { req, res } = mockReqRes({
                params: { id: '1' },
                body: { name: 'Updated' }
            });
            await courtController.update(req, res);

            expect(res.json).toHaveBeenCalledWith({ message: 'Court updated successfully', court });
        });

        test('returns 404 when court not found', async () => {
            Court.update.mockResolvedValue(null);

            const { req, res } = mockReqRes({
                params: { id: 'nonexistent' },
                body: { name: 'Test' }
            });
            await courtController.update(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns 500 on error', async () => {
            Court.update.mockRejectedValue(new Error('fail'));

            const { req, res } = mockReqRes({
                params: { id: '1' },
                body: { name: 'Test' }
            });
            await courtController.update(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ── updateStatus ─────────────────────────────────────
    describe('updateStatus', () => {
        test('updates status and returns success', async () => {
            const court = { id: '1', current_status: 'RENOVATE' };
            Court.updateStatus.mockResolvedValue(court);

            const { req, res } = mockReqRes({
                params: { id: '1' },
                body: { status: 'RENOVATE' }
            });
            await courtController.updateStatus(req, res);

            expect(res.json).toHaveBeenCalledWith({ message: 'Court status updated successfully', court });
        });

        test('returns 400 for invalid status', async () => {
            const { req, res } = mockReqRes({
                params: { id: '1' },
                body: { status: 'INVALID' }
            });
            await courtController.updateStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Status must be one of: AVAILABLE, RENOVATE, DAMAGED'
            });
        });

        test('returns 400 when status is missing', async () => {
            const { req, res } = mockReqRes({
                params: { id: '1' },
                body: {}
            });
            await courtController.updateStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when court not found', async () => {
            Court.updateStatus.mockResolvedValue(null);

            const { req, res } = mockReqRes({
                params: { id: 'nonexistent' },
                body: { status: 'AVAILABLE' }
            });
            await courtController.updateStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns 500 on error', async () => {
            Court.updateStatus.mockRejectedValue(new Error('fail'));

            const { req, res } = mockReqRes({
                params: { id: '1' },
                body: { status: 'AVAILABLE' }
            });
            await courtController.updateStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
