const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let dbStatus = {
  connected: false,
  type: 'Unknown',
  uri: '',
  error: null
};

// Embedded local fallback store in case MongoDB is not yet running locally
class LocalStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = { users: [], items: [] };
    this.init();
  }

  init() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(this.filePath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      } catch (e) {
        console.error('Error loading local store:', e.message);
      }
    } else {
      this.save();
    }
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  // Users
  findUserByEmail(email) {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id) {
    return this.data.users.find(u => u._id === id);
  }

  updateUser(id, updates) {
    const user = this.data.users.find(u => u._id === id);
    if (!user) return null;
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return user;
  }

  createUser(user) {
    const newUser = {
      _id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      ...user,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  // Vault Items
  findItemsByUserId(userId) {
    return this.data.items.filter(item => item.userId === userId);
  }

  findItemById(id) {
    return this.data.items.find(item => item._id === id);
  }

  createItem(item) {
    const newItem = {
      _id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.items.push(newItem);
    this.save();
    return newItem;
  }

  updateItem(id, userId, updates) {
    const index = this.data.items.findIndex(item => item._id === id && item.userId === userId);
    if (index === -1) return null;
    this.data.items[index] = {
      ...this.data.items[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.items[index];
  }

  deleteItem(id, userId) {
    const index = this.data.items.findIndex(item => item._id === id && item.userId === userId);
    if (index === -1) return false;
    this.data.items.splice(index, 1);
    this.save();
    return true;
  }
}

const localStore = new LocalStore(path.join(__dirname, '../../data/vault_store.json'));

async function connectDB() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/securevault';

  try {
    console.log(`Connecting to MongoDB at: ${mongoURI.replace(/:([^:@]+)@/, ':****@')}...`);
    
    // Set a 3.5s timeout for initial connection attempt so it falls back quickly if offline
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3500,
      connectTimeoutMS: 3500
    });

    dbStatus = {
      connected: true,
      type: 'MongoDB',
      uri: mongoURI.replace(/:([^:@]+)@/, ':****@'),
      error: null
    };

    console.log('✓ Successfully connected to MongoDB Database!');
  } catch (err) {
    console.warn('⚠️  Could not connect to MongoDB:', err.message);
    console.warn('ℹ️  Switching seamlessly to embedded local secure store (Zero data loss).');
    console.warn('ℹ️  To connect to MongoDB Atlas, add MONGODB_URI=your_connection_string in .env');

    dbStatus = {
      connected: false,
      type: 'Local Safe Store (MongoDB fallback)',
      uri: mongoURI,
      error: err.message
    };
  }
}

function getDBStatus() {
  return dbStatus;
}

module.exports = {
  connectDB,
  getDBStatus,
  localStore,
  isMongooseConnected: () => mongoose.connection.readyState === 1
};
