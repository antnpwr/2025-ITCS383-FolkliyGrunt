const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes — each person registers their own route file here
app.use('/api/auth', require('./routes/auth'));
// app.use('/api/courts', require('./routes/courts'));     // Person 2
app.use('/api/bookings', require('./routes/bookings')); // Person 3
// app.use('/api/waitlist', require('./routes/waitlist')); // Person 4
// app.use('/api/reviews', require('./routes/reviews'));   // Person 5

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server (only if not in test mode)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
