const i18n = require('../middleware/i18n');

describe('i18n Middleware', () => {
  const mockRes = {};
  const mockNext = jest.fn();

  test('defaults to English', () => {
    const req = { query: {}, headers: {} };
    i18n(req, mockRes, mockNext);
    expect(req.lang).toBe('en');
    expect(req.t.app_name).toBe('Badminton Court Management System');
    expect(mockNext).toHaveBeenCalled();
  });

  test('reads language from query param', () => {
    const req = { query: { lang: 'th' }, headers: {} };
    i18n(req, mockRes, mockNext);
    expect(req.lang).toBe('th');
    expect(req.t.app_name).toBe('ระบบจัดการสนามแบดมินตัน');
  });

  test('falls back to English for unknown language', () => {
    const req = { query: { lang: 'jp' }, headers: {} };
    i18n(req, mockRes, mockNext);
    expect(req.lang).toBe('en');
  });

  test('reads language from Accept-Language header', () => {
    const req = { query: {}, headers: { 'accept-language': 'th,en;q=0.9' } };
    i18n(req, mockRes, mockNext);
    expect(req.lang).toBe('th');
    expect(req.t.app_name).toBe('ระบบจัดการสนามแบดมินตัน');
  });

  test('reads zh language from Accept-Language header', () => {
    const req = { query: {}, headers: { 'accept-language': 'zh-CN,zh;q=0.9' } };
    i18n(req, mockRes, mockNext);
    expect(req.lang).toBe('zh');
  });
});
