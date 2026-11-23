const express = require('express');
const router = express.Router();
const VaultItem = require('../models/VaultItem');
const { authMiddleware } = require('../middleware/auth');
const { isMongooseConnected, localStore } = require('../config/db');

// All vault routes require authentication
router.use(authMiddleware);

// 1. Get all vault items for the authenticated user
router.get('/items', async (req, res) => {
  try {
    const userId = req.user.id;
    let items;

    if (isMongooseConnected()) {
      items = await VaultItem.find({ userId }).sort({ updatedAt: -1 });
    } else {
      items = localStore.findItemsByUserId(userId);
      items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    return res.json({ items });
  } catch (err) {
    console.error('Error fetching vault items:', err);
    return res.status(500).json({ error: 'Failed to retrieve vault items' });
  }
});

// 2. Create a new encrypted vault item
router.post('/items', async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, category, favorite, website, username, encryptedData } = req.body;

    if (!title || !encryptedData || !encryptedData.iv || !encryptedData.ciphertext) {
      return res.status(400).json({ error: 'Title and valid encryptedData are required' });
    }

    let newItem;
    if (isMongooseConnected()) {
      newItem = await VaultItem.create({
        userId,
        title: title.trim(),
        category: category || 'login',
        favorite: Boolean(favorite),
        website: website || '',
        username: username || '',
        encryptedData
      });
    } else {
      newItem = localStore.createItem({
        userId,
        title: title.trim(),
        category: category || 'login',
        favorite: Boolean(favorite),
        website: website || '',
        username: username || '',
        encryptedData
      });
    }

    return res.status(201).json({ item: newItem });
  } catch (err) {
    console.error('Error creating vault item:', err);
    return res.status(500).json({ error: 'Failed to create item: ' + err.message });
  }
});

// 3. Update an existing vault item
router.put('/items/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;
    const { title, category, favorite, website, username, encryptedData } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (category !== undefined) updates.category = category;
    if (favorite !== undefined) updates.favorite = Boolean(favorite);
    if (website !== undefined) updates.website = website;
    if (username !== undefined) updates.username = username;
    if (encryptedData !== undefined) updates.encryptedData = encryptedData;

    let updatedItem;
    if (isMongooseConnected()) {
      updatedItem = await VaultItem.findOneAndUpdate(
        { _id: itemId, userId },
        updates,
        { new: true }
      );
    } else {
      updatedItem = localStore.updateItem(itemId, userId, updates);
    }

    if (!updatedItem) {
      return res.status(404).json({ error: 'Item not found or unauthorized' });
    }

    return res.json({ item: updatedItem });
  } catch (err) {
    console.error('Error updating vault item:', err);
    return res.status(500).json({ error: 'Failed to update item: ' + err.message });
  }
});

// 4. Toggle Favorite
router.patch('/items/:id/favorite', async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;

    let item;
    if (isMongooseConnected()) {
      item = await VaultItem.findOne({ _id: itemId, userId });
      if (!item) return res.status(404).json({ error: 'Item not found' });
      item.favorite = !item.favorite;
      await item.save();
    } else {
      item = localStore.findItemById(itemId);
      if (!item || item.userId !== userId) return res.status(404).json({ error: 'Item not found' });
      item.favorite = !item.favorite;
      localStore.save();
    }

    return res.json({ item });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

// 5. Delete an item
router.delete('/items/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;

    let deleted = false;
    if (isMongooseConnected()) {
      const result = await VaultItem.deleteOne({ _id: itemId, userId });
      deleted = result.deletedCount > 0;
    } else {
      deleted = localStore.deleteItem(itemId, userId);
    }

    if (!deleted) {
      return res.status(404).json({ error: 'Item not found or unauthorized' });
    }

    return res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Error deleting vault item:', err);
    return res.status(500).json({ error: 'Failed to delete item: ' + err.message });
  }
});

module.exports = router;
