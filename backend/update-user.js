const http = require('http');

const data = JSON.stringify({
  email: 'muppetalert1@protonmail.com',
  tier: 'BUSINESS',
  password: 'Panserainer@100'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/admin/update-user-tier',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-token': 'temp-admin-token-change-me',
    'Content-Length': data.length
  }
};

console.log('Updating user tier via admin endpoint...');

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log('Response:', body);
    
    if (res.statusCode === 200) {
      console.log('✅ SUCCESS: User tier updated successfully to BUSINESS');
    } else {
      console.log('❌ ERROR: Failed to update user tier');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error);
});

req.write(data);
req.end();