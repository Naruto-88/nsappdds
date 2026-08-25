const fs = require('fs');
const path = require('path');

// Manually parse .env using only Node.js core modules
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        if (key && !process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  } catch (e) {}
}

loadEnv(path.join(__dirname, '.env'));
loadEnv(path.join(__dirname, 'server', '.env'));
loadEnv(path.join(process.cwd(), '.env'));
loadEnv(path.join(process.cwd(), 'server', '.env'));

require('./server/dist/main.js');
