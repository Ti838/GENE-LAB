require('dotenv').config({ path: 'backend/.env' });
const jwt = require('jsonwebtoken');

const token = jwt.sign(
    { _id: '123456789012345678901234', role: 'admin' },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '1h' }
);

const https = require('https');

const req = https.get('https://genelab-worker-production.up.railway.app/api/admin/stats', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Response:', res.statusCode, data));
});
req.on('error', err => console.log('Error:', err));
