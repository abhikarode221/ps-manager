const mongoose = require('mongoose');

const VaultItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed, // supports ObjectId or local string id
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['login', 'card', 'note', 'server', 'other'],
    default: 'login'
  },
  favorite: {
    type: Boolean,
    default: false
  },
  website: {
    type: String,
    default: ''
  },
  username: {
    type: String,
    default: ''
  },
  encryptedData: {
    iv: {
      type: String,
      required: true
    },
    ciphertext: {
      type: String,
      required: true
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('VaultItem', VaultItemSchema);
