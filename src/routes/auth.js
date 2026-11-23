const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');
const { isMongooseConnected, localStore } = require('../config/db');

// Helper to find user by email
async function getUserByEmail(email) {
  if (isMongooseConnected()) {
    return await User.findOne({ email: email.toLowerCase() });
  } else {
    return localStore.findUserByEmail(email);
  }
}

// Helper to find user by id
async function getUserById(id) {
  if (isMongooseConnected()) {
    return await User.findById(id);
  } else {
    return localStore.findUserById(id);
  }
}

// 1. Get user master salt (pre-login)
router.post('/salt', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.json({ salt: null });
    }

    return res.json({ salt: user.masterSalt });
  } catch (err) {
    console.error('Error fetching salt:', err);
    return res.status(500).json({ error: 'Failed to retrieve salt' });
  }
});

// 2. Register
router.post('/register', async (req, res) => {
  try {
    const { email, authHash, masterSalt, pinHash } = req.body;

    if (!email || !authHash || !masterSalt) {
      return res.status(400).json({ error: 'Email, authHash, and masterSalt are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await getUserByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'A vault with this email already exists' });
    }

    // Hash the client's computed auth key using bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(authHash, saltRounds);
    
    // Hash the 6-digit PIN if provided
    let hashedPin = null;
    if (pinHash) {
      hashedPin = await bcrypt.hash(pinHash, saltRounds);
    }

    let newUser;
    if (isMongooseConnected()) {
      newUser = await User.create({
        email: cleanEmail,
        authHash: passwordHash,
        masterSalt: masterSalt,
        pinHash: hashedPin
      });
    } else {
      newUser = localStore.createUser({
        email: cleanEmail,
        authHash: passwordHash,
        masterSalt: masterSalt,
        pinHash: hashedPin
      });
    }

    const userId = newUser._id.toString();
    const token = jwt.sign({ id: userId, email: cleanEmail }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      message: 'Vault registered successfully',
      token,
      user: {
        id: userId,
        email: cleanEmail,
        hasPin: Boolean(hashedPin)
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// 3. Login
router.post('/login', async (req, res) => {
  try {
    const { email, authHash } = req.body;

    if (!email || !authHash) {
      return res.status(400).json({ error: 'Email and master password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or master password' });
    }

    // Verify auth hash against stored bcrypt hash
    const isValid = await bcrypt.compare(authHash, user.authHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid email or master password' });
    }

    const userId = user._id.toString();
    const token = jwt.sign({ id: userId, email: cleanEmail }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      message: 'Vault unlocked successfully',
      token,
      user: {
        id: userId,
        email: cleanEmail,
        hasPin: Boolean(user.pinHash)
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// 4. Current user info
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({
      user: {
        id: req.user.id,
        email: user.email,
        hasPin: Boolean(user.pinHash)
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// 5. Set or update 6-digit PIN
router.post('/set-pin', authMiddleware, async (req, res) => {
  try {
    const { pinHash } = req.body;
    if (!pinHash) {
      return res.status(400).json({ error: 'PIN hash is required' });
    }

    const hashedPin = await bcrypt.hash(pinHash, 10);
    const userId = req.user.id;

    if (isMongooseConnected()) {
      await User.findByIdAndUpdate(userId, { pinHash: hashedPin });
    } else {
      localStore.updateUser(userId, { pinHash: hashedPin });
    }

    return res.json({ message: '6-digit PIN set successfully', hasPin: true });
  } catch (err) {
    console.error('Error setting PIN:', err);
    return res.status(500).json({ error: 'Failed to set PIN: ' + err.message });
  }
});

// 6. Verify 6-digit PIN
router.post('/verify-pin', authMiddleware, async (req, res) => {
  try {
    const { pinHash } = req.body;
    if (!pinHash) {
      return res.status(400).json({ error: 'PIN hash is required' });
    }

    const userId = req.user.id;
    const user = await getUserById(userId);
    if (!user || !user.pinHash) {
      return res.status(400).json({ error: 'No PIN configured for this account' });
    }

    const isValid = await bcrypt.compare(pinHash, user.pinHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect 6-digit PIN', valid: false });
    }

    return res.json({ valid: true, message: 'PIN verified' });
  } catch (err) {
    console.error('Error verifying PIN:', err);
    return res.status(500).json({ error: 'PIN verification failed' });
  }
});

module.exports = router;
