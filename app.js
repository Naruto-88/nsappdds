const path = require('path');
const fs = require('fs');

// Try loading .env from multiple locations
const envPaths = [
  path.join(__dirname, '.env'),
  path.join(__dirname, 'server', '.env')
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    require('dotenv').config({ path: p });
  }
}

require('./server/dist/main.js');
