# Fix: Deploy Test User to Heroku

## Problem
Your test account `muppetalert1@protonmail.com` has BUSINESS tier access in your local database, but your frontend connects to Heroku where the user doesn't exist or has FREE tier.

## Solution
Add a temporary admin endpoint to update the user tier on Heroku, then call it to fix the issue.

## Step-by-Step Instructions

### 1. Add Admin Endpoint to Server
Add this code to `backend/src/server.ts` right after line 210 (after the `/auth/resend-verification` endpoint):

```javascript
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
```

### 2. Deploy to Heroku
```bash
cd backend
git add .
git commit -m "Add temporary admin endpoint for user tier update"
git push heroku main
```

### 3. Update User Tier on Heroku
Run the provided script or use this curl command:

```bash
curl -X POST https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/admin/update-user-tier \
  -H "Content-Type: application/json" \
  -H "x-admin-token: temp-admin-token-change-me" \
  -d '{
    "email": "muppetalert1@protonmail.com",
    "tier": "BUSINESS",
    "password": "Panserainer@100"
  }'
```

### 4. Test the Fix
1. Clear your browser cache and localStorage
2. Go to your frontend application
3. Log in with:
   - Email: `muppetalert1@protonmail.com`
   - Password: `Panserainer@100`
4. You should now see BUSINESS tier features unlocked!

### 5. Clean Up (IMPORTANT)
After confirming the fix works, **remove the admin endpoint** from `server.ts` for security:

1. Delete the admin endpoint code from `server.ts`
2. Deploy again to Heroku
3. The endpoint will no longer exist

## What This Does
- Creates a secure admin endpoint (requires special token)
- Updates the user `muppetalert1@protonmail.com` to BUSINESS tier on Heroku
- Sets the password and verifies the email
- Allows you to test the BUSINESS tier features

## Security Note
This admin endpoint is temporary and should be removed after use to prevent unauthorized access to user management functions.

## Expected Result
After completing these steps, your test account should have full BUSINESS tier access and all premium features should be unlocked when you log in.