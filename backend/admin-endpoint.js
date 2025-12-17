// TEMPORARY ADMIN ENDPOINT - Add this to your server.ts file
// Place this code right after the /auth/resend-verification endpoint (around line 210)

// TEMPORARY ADMIN ENDPOINT - Remove after use
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'temp-admin-token-change-me';

app.post('/admin/update-user-tier', async (req, res) => {
  const { email, tier, password } = req.body;
  const adminToken = req.headers['x-admin-token'];
  
  if (adminToken !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!email || !tier) {
    return res.status(400).json({ error: 'Email and tier are required' });
  }
  
  if (!['FREE', 'PREMIUM', 'BUSINESS'].includes(tier)) {
    return res.status(400).json({ error: 'Invalid tier. Must be FREE, PREMIUM, or BUSINESS' });
  }
  
  try {
    const updateData: any = { tier };
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }
    
    // Set email as verified if not already
    updateData.emailVerified = true;
    
    const user = await prisma.user.updateMany({
      where: { email },
      data: updateData,
    });
    
    if (user.count === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`Admin: Updated user ${email} to tier ${tier}`);
    res.json({ message: `User ${email} updated to tier ${tier} successfully` });
  } catch (error) {
    console.error('Admin update error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// HOW TO USE THIS ENDPOINT:
// 1. Add the code above to your server.ts file (right after line 210)
// 2. Deploy to Heroku
// 3. Call the endpoint with:
//    curl -X POST https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/admin/update-user-tier \
//      -H "Content-Type: application/json" \
//      -H "x-admin-token: temp-admin-token-change-me" \
//      -d '{"email": "muppetalert1@protonmail.com", "tier": "BUSINESS", "password": "Panserainer@100"}'
// 4. Remove this endpoint from server.ts after use for security