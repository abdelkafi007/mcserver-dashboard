const { Rcon } = require('rcon-client');

const RCON_HOST = process.env.RCON_HOST || '127.0.0.1';
const RCON_PORT = parseInt(process.env.RCON_PORT || '25575', 10);
const RCON_PASSWORD = process.env.RCON_PASSWORD || 'admin_secure_123';
const RCON_TIMEOUT = 3000;

/**
 * Sanitizes the incoming command to prevent injection attacks.
 * Strips out dangerous special characters, allowing only safe characters.
 */
function sanitizeCommand(command) {
    if (typeof command !== 'string') return '';
    // Allow alphanumeric characters, spaces, hyphens, underscores, colons, slashes, periods, and commas.
    // Strip everything else.
    return command.replace(/[^a-zA-Z0-9 \-_.:/,@]/g, '').trim();
}

/**
 * Executes a command on the Minecraft server via RCON.
 * Includes a strict connection timeout and retry logic.
 */
async function executeCommand(rawCommand, maxRetries = 3) {
    const command = sanitizeCommand(rawCommand);
    if (!command) {
        throw new Error('Invalid or empty command after sanitization.');
    }

    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const rcon = await Rcon.connect({
                host: RCON_HOST,
                port: RCON_PORT,
                password: RCON_PASSWORD,
                timeout: RCON_TIMEOUT
            });

            // Send the command
            const response = await rcon.send(command);
            
            // Disconnect properly
            rcon.end();
            
            return response;
        } catch (error) {
            lastError = error;
            console.warn(`RCON connection attempt ${attempt} failed: ${error.message}`);
            
            // Delay before retry, unless it's the last attempt
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    throw new Error(`Failed to execute command after ${maxRetries} attempts. Last error: ${lastError.message}`);
}

module.exports = {
    executeCommand,
    sanitizeCommand
};
