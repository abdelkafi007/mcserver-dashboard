const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/server');
const modsRoutes = require('./routes/mods');
const configRoutes = require('./routes/config');
const { authMiddleware } = require('./middleware/auth');

const path = require('path');

app.use('/api/auth', authRoutes);
app.use('/api/server', authMiddleware, serverRoutes);
app.use('/api/mods', authMiddleware, modsRoutes);
app.use('/api/config', authMiddleware, configRoutes);

// Serve the static frontend dashboard files
app.use(express.static(path.join(__dirname, '../dashboard')));

// Catch-all fallback to serve index.html for any unmatched route
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/index.html'));
});

app.listen(port, () => {
  console.log(`Backend API listening locally on port ${port}`);
});
