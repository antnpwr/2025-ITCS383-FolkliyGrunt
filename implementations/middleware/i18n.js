const fs = require('fs');
const path = require('path');

// Load all translation files at startup
const locales = {};
['en', 'th', 'zh'].forEach(lang => {
  const filePath = path.join(__dirname, '..', 'locales', `${lang}.json`);
  locales[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
});

/**
 * i18n Middleware
 * Detects language from:
 * 1. Query param: ?lang=th
 * 2. Header: Accept-Language
 * 3. Default: 'en'
 *
 * Attaches `req.t` (translations) and `req.lang` to the request.
 *
 * Usage in controller:
 *   res.json({ message: req.t.common.success });
 */
const i18n = (req, res, next) => {
  // Priority: query param > header > default
  let lang = req.query.lang
    || req.headers['accept-language']?.split(',')[0]?.split('-')[0]
    || 'en';

  // Validate language
  if (!locales[lang]) lang = 'en';

  req.lang = lang;
  req.t = locales[lang];
  next();
};

module.exports = i18n;
