require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB, getDBStatus } = require('./config/db');

const authRoutes = require('./routes/auth');
const vaultRoutes = require('./routes/vault');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy for live cloud hosting (Render, Railway, Fly, Nginx, etc.)
app.set('trust proxy', 1);

// Security Middleware (Helmet with CSP configured for our static frontend)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

// CORS Configuration
app.use(cors());

// Rate Limiting on authentication & api requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', limiter);

// Request parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vault', vaultRoutes);

// System Status endpoint
app.get('/api/system/status', (req, res) => {
  const status = getDBStatus();
  res.json({
    status: 'ok',
    database: status.type,
    connected: status.connected,
    details: status.uri || 'Embedded Safe Store'
  });
});

// Single Page Application fallback to index.html for unknown routes
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Server
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🔒 AetherVault Server running on http://localhost:${PORT}`);
    console.log(`🛡️  Zero-Knowledge Client-Side Encryption Enabled`);
    console.log(`📦 Database: ${getDBStatus().type}`);
    console.log(`=======================================================`);
  });
}

start().catch(err => {
  console.error('Fatal startup error:', err);
});
