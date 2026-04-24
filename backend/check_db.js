require('dotenv').config();
const mongoose = require('mongoose');
async function verifyData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const admin = new mongoose.mongo.Admin(mongoose.connection.db);
        const result = await admin.listDatabases();
        console.log('--- ALL DATABASES IN YOUR CLUSTER ---');
        result.databases.forEach(db => console.log(`* ${db.name}`));
        
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const users = await User.find({});
        console.log('\n--- DATA IN "GENELAB" DATABASE ---');
        users.forEach(u => console.log(`- [${u.role}] ${u.name} (${u.email})`));
        process.exit(0);
    } catch (err) { console.error(err); process.exit(1); }
}
verifyData();
