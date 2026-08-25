const fs = require('fs');
const path = require('path');

async function testAds() {
  try {
    const tokenPath = path.join(__dirname, 'server', 'data', 'google-token.json');
    if (!fs.existsSync(tokenPath)) {
      console.error('ERROR: google-token.json not found at ' + tokenPath);
      return;
    }
    const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    console.log('Found Access Token for:', tokenData.email || 'tech@netstripes.com');

    const headers = {
      'Authorization': 'Bearer ' + tokenData.accessToken,
      'developer-token': 'P90mFwI64LoK8U11omkK4g',
      'login-customer-id': '1234328742',
      'Content-Type': 'application/json',
    };

    const res = await fetch('https://googleads.googleapis.com/v19/customers/9624324513/googleAds:search', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: 'SELECT metrics.cost_micros, metrics.clicks, metrics.conversions FROM customer LIMIT 1' }),
    });

    const status = res.status;
    const body = await res.text();

    console.log('========== GOOGLE ADS API RESPONSE ==========');
    console.log('HTTP STATUS:g, status);
    console.log('BODY:');
    console.log(body);
    console.log('==============================================');
  } catch (err) {
    console.error('TEST ERROR:', err.message);
  }
}

testAds();
