const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const rconBridge = require('../rconBridge');

const FORGE_DIR = '/home/ubuntu/minecraft';
const WORLD_DIR = path.resolve(FORGE_DIR, 'world');
const util = require('util');
const execAsync = util.promisify(require('child_process').exec);

async function checkStatus() {
  try {
    const { stdout } = await execAsync('sudo systemctl is-active minecraft');
    return stdout.trim() === 'active';
  } catch (error) {
    return false;
  }
}

// GET /api/server/status
// GET /api/server/status
router.get('/status', async (req, res) => {
  const isRunning = await checkStatus();
  res.json({
    success: true,
    running: isRunning
  });
});

// POST /api/server/start
router.post('/start', async (req, res) => {
  try {
    const isRunning = await checkStatus();
    if (isRunning) {
      return res.status(400).json({
        success: false,
        error: 'Server is already running'
      });
    }

    await execAsync('sudo systemctl start minecraft');

    res.json({
      success: true,
      message: 'Server start command issued successfully'
    });
  } catch (error) {
    console.error('Error starting server:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start the server',
      details: error.message
    });
  }
});

// POST /api/server/stop
router.post('/stop', async (req, res) => {
  try {
    const isRunning = await checkStatus();
    if (!isRunning) {
      return res.status(400).json({
        success: false,
        error: 'Server is not running'
      });
    }

    await execAsync('sudo systemctl stop minecraft');

    res.json({
      success: true,
      message: 'Server stop command issued successfully (systemctl stop minecraft)'
    });
  } catch (error) {
    console.error('Error stopping server:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop the server',
      details: error.message
    });
  }
});

// POST /api/server/command
router.post('/command', async (req, res) => {
  try {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ success: false, error: 'Command is required' });
    }

    const response = await rconBridge.executeCommand(command);
    res.json({ success: true, message: 'Command executed', response });
  } catch (error) {
    console.error('Error executing command:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute command. Is the server online?',
      details: error.message
    });
  }
});

// POST /api/server/whitelist
router.post('/whitelist', async (req, res) => {
  try {
    const { action, username } = req.body;

    if (!action || !['add', 'remove'].includes(String(action).toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: "Action must be either 'add' or 'remove'"
      });
    }

    if (!username || typeof username !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Username must be a non-empty string'
      });
    }

    const sanitizedUsername = username.replace(/[^a-zA-Z0-9_]/g, '').trim();
    if (!sanitizedUsername) {
      return res.status(400).json({
        success: false,
        error: 'Invalid username format'
      });
    }

    const isRunning = await checkStatus();
    if (!isRunning) {
      return res.status(500).json({
        success: false,
        error: 'Server process is not running'
      });
    }

    const act = String(action).toLowerCase();
    
    // Use screen to inject command since we no longer have stdin pipe
    await execAsync(`screen -S forge -X stuff "whitelist ${act} ${sanitizedUsername}\\r"`);

    res.json({
      success: true,
      message: `Whitelist command sent to server console: whitelist ${act} ${sanitizedUsername}`,
      action: act,
      username: sanitizedUsername
    });
  } catch (error) {
    console.error('Error executing whitelist command:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute whitelist command',
      details: error.message
    });
  }
});

// POST /api/server/world-restart
router.post('/world-restart', async (req, res) => {
  try {
    const isRunningStatus = await checkStatus();
    // 1. Stop Minecraft process if running
    if (isRunningStatus) {
      await execAsync('sudo systemctl stop minecraft');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } else {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // 3. Use fs.rm with { recursive: true, force: true } to delete world directory
    await fs.rm(WORLD_DIR, { recursive: true, force: true });

    // 4. Return success status
    res.json({ success: true, message: 'World wiped and server reset successfully' });
  } catch (error) {
    console.error('Error during world restart:', error);
    res.status(500).json({ success: false, error: 'Failed to restart world', details: error.message });
  }
});

module.exports = router;
