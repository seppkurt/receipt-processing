require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const apiRoutes = require('./routes/api');
const DatabaseService = require('./services/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new DatabaseService();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve matching page
app.get('/matching', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'matching.html'));
});

// Serve receipts list page
app.get('/receipts', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'receipts.html'));
});

// Serve receipt detail page
app.get('/receipt/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'receipt.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function startServer() {
  try {
    await db.initialize();
    console.log('Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Access the application at: http://localhost:${PORT}`);
      console.log(`Access the matching interface at: http://localhost:${PORT}/matching`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 