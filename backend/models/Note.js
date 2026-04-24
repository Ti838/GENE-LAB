const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dnaFile: { type: mongoose.Schema.Types.ObjectId, ref: 'DNA' },
    title: { type: String, default: 'Untitled Note' },
    content: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

noteSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Note', noteSchema);
