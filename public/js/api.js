/**
 * VaultAPI - API Client for Auth & Vault endpoints
 */

const API_BASE = '/api';

class VaultAPI {
  constructor() {
    this.token = localStorage.getItem('vault_token') || null;
    this.user = JSON.parse(localStorage.getItem('vault_user') || 'null');
  }

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    if (token) {
      localStorage.setItem('vault_token', token);
      localStorage.setItem('vault_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('vault_token');
      localStorage.removeItem('vault_user');
    }
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  }

  // Pre-login: fetch user salt (or generate preview salt if new)
  async getSalt(email) {
    return await this.request('/auth/salt', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  // Register
  async register(email, authHash, masterSalt, pinHash = null) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, authHash, masterSalt, pinHash })
    });
    this.setAuth(data.token, data.user);
    return data;
  }

  // Set or update 6-digit PIN
  async setPin(pinHash) {
    const data = await this.request('/auth/set-pin', {
      method: 'POST',
      body: JSON.stringify({ pinHash })
    });
    if (this.user) {
      this.user.hasPin = true;
      localStorage.setItem('vault_user', JSON.stringify(this.user));
    }
    return data;
  }

  // Verify 6-digit PIN
  async verifyPin(pinHash) {
    return await this.request('/auth/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pinHash })
    });
  }

  // Login
  async login(email, authHash) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, authHash })
    });
    this.setAuth(data.token, data.user);
    return data;
  }

  // Get current user profile & db status
  async getProfile() {
    return await this.request('/auth/me');
  }

  // Vault Items CRUD
  async getItems() {
    return await this.request('/vault/items');
  }

  async createItem(item) {
    return await this.request('/vault/items', {
      method: 'POST',
      body: JSON.stringify(item)
    });
  }

  async updateItem(id, item) {
    return await this.request(`/vault/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item)
    });
  }

  async deleteItem(id) {
    return await this.request(`/vault/items/${id}`, {
      method: 'DELETE'
    });
  }

  async toggleFavorite(id) {
    return await this.request(`/vault/items/${id}/favorite`, {
      method: 'PATCH'
    });
  }

  // Check system/DB status
  async getSystemStatus() {
    return await this.request('/system/status');
  }
}

window.vaultAPI = new VaultAPI();
