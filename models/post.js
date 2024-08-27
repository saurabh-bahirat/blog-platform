// models/post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Link posts to users
});

module.exports = mongoose.model('Post', postSchema);
