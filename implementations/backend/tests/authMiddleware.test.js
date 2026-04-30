jest.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
  },
}));

jest.mock('../models/Profile', () => ({
  findByAuthId: jest.fn(),
}));

const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');
const { supabase } = require('../config/supabase');
const Profile = require('../models/Profile');

test('authMiddleware rejects missing token', async () => {
  const req = { headers: {} };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();

  await authMiddleware(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
  expect(next).not.toHaveBeenCalled();
});

test('authMiddleware rejects invalid token', async () => {
  supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Bad token' } });

  const req = { headers: { authorization: 'Bearer badtoken' } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();

  await authMiddleware(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  expect(next).not.toHaveBeenCalled();
});

test('authMiddleware sets req.user when token is valid', async () => {
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'user@test.com' } },
    error: null,
  });
  Profile.findByAuthId.mockResolvedValue({ role: 'ADMIN', full_name: 'Admin User' });

  const req = { headers: { authorization: 'Bearer validtoken' } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();

  await authMiddleware(req, res, next);

  expect(req.user).toEqual({
    id: 'user-1',
    email: 'user@test.com',
    role: 'ADMIN',
    profile: { role: 'ADMIN', full_name: 'Admin User' },
  });
  expect(next).toHaveBeenCalled();
});

test('adminOnly rejects non-admin users', () => {
  const req = { user: { role: 'CUSTOMER' } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();

  adminOnly(req, res, next);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith({ error: 'Admin access required' });
  expect(next).not.toHaveBeenCalled();
});

test('adminOnly allows admin users', () => {
  const req = { user: { role: 'ADMIN' } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();

  adminOnly(req, res, next);

  expect(next).toHaveBeenCalled();
});
