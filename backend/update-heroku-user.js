const fetch = require('node-fetch');

const ADMIN_TOKEN = 'temp-admin-token-change-me';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function updateUserTier() {
  try {
    console.log('Updating user tier via admin endpoint...');
    
    const response = await fetch(`${BACKEND_URL}/admin/update-user-tier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': ADMIN_TOKEN
      },
      body: JSON.stringify({
        email: 'muppetalert1@protonmail.com',
        tier: 'BUSINESS',
        password: 'Panserainer@100'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS:', result.message);
      console.log('User tier updated successfully to BUSINESS');
    } else {
      console.error('❌ ERROR:', result.error);
    }
  } catch (error) {
    console.error('❌ Failed to update user tier:', error);
  }
}

updateUserTier();