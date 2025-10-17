const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for React app
}));
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes (antes de servir archivos estáticos)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cases', require('./routes/cases'));
app.use('/api/sessions', require('./routes/sessions'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API info endpoint (movido a /api)
app.get('/api', (req, res) => {
  res.json({
    message: 'Mediation Platform API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      cases: '/api/cases',
      sessions: '/api/sessions',
      health: '/health'
    }
  });
});

// Servir archivos estáticos del frontend React
const clientBuildPath = path.join(__dirname, '../client/build');
app.use(express.static(clientBuildPath));

// Todas las rutas no-API deben servir el index.html de React
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║   Mediation Platform API                  ║
  ║   Server running on port ${PORT}            ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}               ║
  ╚═══════════════════════════════════════════╝
  `);
});

module.exports = app;
