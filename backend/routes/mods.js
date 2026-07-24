const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const MODS_DIR = '/home/ubuntu/minecraft/mods';

// Ensure mods directory exists
fs.mkdir(MODS_DIR, { recursive: true }).catch(console.error);

// Set up multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, MODS_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (path.extname(file.originalname) !== '.jar') {
      return cb(new Error('Only .jar files are allowed'));
    }
    cb(null, true);
  }
});

// GET /api/mods - List all mods
router.get('/', async (req, res) => {
  try {
    const files = await fs.readdir(MODS_DIR);
    const jars = files.filter(file => file.endsWith('.jar'));
    res.json({ success: true, mods: jars });
  } catch (error) {
    console.error('Error reading mods directory:', error);
    res.status(500).json({ success: false, error: 'Failed to list mods', details: error.message });
  }
});

// POST /api/mods - Upload a mod
router.post('/', upload.single('mod'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No .jar file uploaded or invalid file type' });
    }
    res.json({ success: true, message: 'Mod uploaded successfully', file: req.file.originalname });
  } catch (error) {
    console.error('Error uploading mod:', error);
    res.status(500).json({ success: false, error: 'Failed to upload mod', details: error.message });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
  next();
});

// DELETE /api/mods/:filename - Delete a mod
router.delete('/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    // Basic security check to prevent directory traversal
    if (!filename.endsWith('.jar') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }

    const filepath = path.join(MODS_DIR, filename);
    await fs.unlink(filepath);
    res.json({ success: true, message: `Mod ${filename} deleted successfully` });
  } catch (error) {
    console.error('Error deleting mod:', error);
    if (error.code === 'ENOENT') {
      return res.status(404).json({ success: false, error: 'Mod not found' });
    }
    res.status(500).json({ success: false, error: 'Failed to delete mod', details: error.message });
  }
});

module.exports = router;
