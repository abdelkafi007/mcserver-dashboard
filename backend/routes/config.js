const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const CONFIG_PATH = '/home/ubuntu/minecraft/server.properties';

// Helper to parse properties file to JSON with proper types
function parseProperties(content) {
  const config = {};
  const lines = content.split('\n');
  
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const idx = line.indexOf('=');
    if (idx !== -1) {
      const key = line.substring(0, idx).trim();
      const value = line.substring(idx + 1).trim();

      // Format typed values for specific keys
      if (key === 'pvp' || key === 'white-list') {
        config[key] = value.toLowerCase() === 'true';
      } else if (key === 'view-distance') {
        const parsed = parseInt(value, 10);
        config[key] = isNaN(parsed) ? 10 : parsed;
      } else if (key === 'gamemode') {
        config[key] = String(value);
      } else {
        config[key] = value;
      }
    }
  }
  return config;
}

// Helper to serialize JSON to properties file content
function stringifyProperties(config) {
  let content = '#Minecraft server properties\n';
  for (const [key, value] of Object.entries(config)) {
    let valStr;
    if (typeof value === 'boolean') {
      valStr = value ? 'true' : 'false';
    } else {
      valStr = String(value);
    }
    content += `${key}=${valStr}\n`;
  }
  return content;
}

// GET /api/config
router.get('/', async (req, res) => {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf8');
    const config = parseProperties(data);
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error reading server config:', error);
    if (error.code === 'ENOENT') {
      return res.status(404).json({ success: false, error: 'server.properties not found' });
    }
    res.status(500).json({ success: false, error: 'Failed to read server config', details: error.message });
  }
});

// POST /api/config
router.post('/', async (req, res) => {
  try {
    const newConfig = req.body;
    if (!newConfig || typeof newConfig !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid config format' });
    }

    // Validate pvp (boolean)
    if ('pvp' in newConfig) {
      if (typeof newConfig['pvp'] !== 'boolean' && newConfig['pvp'] !== 'true' && newConfig['pvp'] !== 'false') {
        return res.status(400).json({ success: false, error: 'pvp must be a boolean' });
      }
      newConfig['pvp'] = String(newConfig['pvp']) === 'true';
    }

    // Validate white-list (boolean)
    if ('white-list' in newConfig) {
      if (typeof newConfig['white-list'] !== 'boolean' && newConfig['white-list'] !== 'true' && newConfig['white-list'] !== 'false') {
        return res.status(400).json({ success: false, error: 'white-list must be a boolean' });
      }
      newConfig['white-list'] = String(newConfig['white-list']) === 'true';
    }

    // Validate view-distance (integer)
    if ('view-distance' in newConfig) {
      const viewDist = Number(newConfig['view-distance']);
      if (!Number.isInteger(viewDist) || viewDist < 2 || viewDist > 32) {
        return res.status(400).json({ success: false, error: 'view-distance must be an integer between 2 and 32' });
      }
      newConfig['view-distance'] = viewDist;
    }

    // Validate gamemode (string)
    if ('gamemode' in newConfig) {
      const validGamemodes = ['survival', 'creative', 'adventure', 'spectator'];
      const mode = String(newConfig['gamemode']).toLowerCase().trim();
      if (!validGamemodes.includes(mode)) {
        return res.status(400).json({ success: false, error: `gamemode must be one of: ${validGamemodes.join(', ')}` });
      }
      newConfig['gamemode'] = mode;
    }

    // Read current config to merge safely
    let currentConfig = {};
    try {
      const data = await fs.readFile(CONFIG_PATH, 'utf8');
      currentConfig = parseProperties(data);
    } catch (err) {
      // file might not exist yet
    }

    const mergedConfig = { ...currentConfig, ...newConfig };
    const content = stringifyProperties(mergedConfig);
    await fs.writeFile(CONFIG_PATH, content, 'utf8');
    
    res.json({ success: true, message: 'Server config updated successfully', config: mergedConfig });
  } catch (error) {
    console.error('Error writing server config:', error);
    res.status(500).json({ success: false, error: 'Failed to write server config', details: error.message });
  }
});

module.exports = router;
