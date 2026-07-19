require('dotenv').config({ path: 'backend/.env' });
const mongoose = require('mongoose');
const User = require('./backend/models/User');
const jwt = require('jsonwebtoken');
const https = require('https');

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
        console.log("No admin found!");
        process.exit(1);
    }
    const token = jwt.sign(
        { _id: admin._id, role: admin.role },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '1h' }
    );
    
    https.get('https://genelab-worker-production.up.railway.app/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => console.log('Response:', res.statusCode, data));
    }).on('error', err => console.log('Error:', err));
}
run().then(() => mongoose.disconnect());
