require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { errorHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimit');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/auth');
const convertRoutes = require('./routes/convert');
const shareRoutes = require('./routes/share');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security middleware ──────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));

// ── Body parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ── Logging ──────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip: (req) => req.url === '/health',
}));

// ── Rate limiting ─────────────────────────────────────────────────
app.use('/api/', generalLimiter);

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: process.env.npm_package_version || '1.0.0' });
});

// ── API routes ────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/convert', convertRoutes);
app.use('/api/v1/share', shareRoutes);
app.use('/api/v1/user', userRoutes);

// ── 404 handler ───────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`PageSnap API running on port ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = app;
