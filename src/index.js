require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes        = require('./routes/auth.js');
const vesselRoutes      = require('./routes/vessels.js');
const crewRoutes        = require('./routes/crew.js');
const watchRoutes       = require('./routes/watches.js');
const logbookRoutes     = require('./routes/logbook.js');
const certificateRoutes = require('./routes/certificates.js');
const dashboardRoutes   = require('./routes/dashboard.js');
const { verifyToken }   = require('./middleware/auth.js');
const { rateLimit }     = require('./middleware/rateLimit.js');

const app  = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(s => s.trim()) : []),
];

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

// Strip unknown fields early via middleware per route group (trust validated data only)
// Auth routes — rate limited; /me requires valid token
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many auth attempts, please try again later' }), authRoutes);

// All data routes require a valid JWT
app.use('/api/vessels',      verifyToken, vesselRoutes);
app.use('/api/crew',         verifyToken, crewRoutes);
app.use('/api/watches',      verifyToken, watchRoutes);
app.use('/api/logbook',      verifyToken, logbookRoutes);
app.use('/api/certificates', verifyToken, certificateRoutes);
app.use('/api/dashboard',    verifyToken, dashboardRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Only start listening when this file is run directly (e.g. `node src/index.js`),
// not when it's `require()`d — such as by the test suite, which imports the app
// to drive it with supertest. Without this guard, importing the module for tests
// opens a real network listener that never closes, forcing every test run to rely
// on `jest --forceExit` as a workaround instead of exiting cleanly on its own.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`VesselOps API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
