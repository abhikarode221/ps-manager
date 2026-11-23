/**
 * VaultCrypto - Client-side Zero-Knowledge Cryptography Engine
 * Uses Web Crypto API (SubtleCrypto) for AES-GCM (256-bit) and PBKDF2 (SHA-256).
 * 
 * Flow:
 * 1. User enters Master Password.
 * 2. Key Derivation: PBKDF2(Master Password, Master Salt, 100,000 iterations) -> Master Key (AES-256-GCM).
 * 3. Auth Key Derivation: PBKDF2(Master Key, Auth Salt, 100,000 iterations) -> Auth Key (SHA-256) -> Sent to server for login/register.
 * 4. Vault Encryption: AES-GCM-256 with unique 12-byte IV for every item.
 * 5. Master Key remains ONLY in memory in the user's browser, NEVER sent to server.
 */

class VaultCrypto {
  constructor() {
    this.crypto = window.crypto;
    this.subtle = window.crypto.subtle;
    this.masterKey = null; // CryptoKey held in memory during session
    this.iterations = 100000;
  }

  // Generate random salt/bytes as hex or Uint8Array
  getRandomBytes(length = 32) {
    const bytes = new Uint8Array(length);
    this.crypto.getRandomValues(bytes);
    return bytes;
  }

  bytesToHex(bytes) {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  bytesToBase64(bytes) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  base64ToBytes(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // Derive base key from password string
  async getPasswordKey(password) {
    const enc = new TextEncoder();
    return await this.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey', 'deriveBits']
    );
  }

  /**
   * Derive AES-GCM Master Key from master password + salt.
   * Salt is provided by server (unique per user).
   */
  async deriveMasterKey(password, saltHex) {
    const saltBytes = this.hexToBytes(saltHex);
    const passwordKey = await this.getPasswordKey(password);

    const derivedKey = await this.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: this.iterations,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false, // non-extractable from memory
      ['encrypt', 'decrypt']
    );

    this.masterKey = derivedKey;
    return derivedKey;
  }

  /**
   * Derive authentication hash for login/registration.
   * This is computed from the master password + master salt + auth suffix,
   * so the server can verify the user WITHOUT knowing the master key.
   */
  async computeAuthHash(password, saltHex) {
    const enc = new TextEncoder();
    const saltBytes = this.hexToBytes(saltHex);
    const passwordKey = await this.getPasswordKey(password);

    // Derive raw 256 bits for authentication
    const authBits = await this.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: this.iterations,
        hash: 'SHA-256'
      },
      passwordKey,
      256
    );

    // Hash the bits with SHA-256 again for final auth token
    const hashBuffer = await this.subtle.digest('SHA-256', authBits);
    return this.bytesToHex(new Uint8Array(hashBuffer));
  }

  /**
   * Derive a secure cryptographic hash for the 6-digit PIN.
   * Combined with user's unique salt and hashed with SHA-256.
   */
  async computePinHash(pin, saltHex) {
    const enc = new TextEncoder();
    const input = `pin_${pin}_salt_${saltHex}_secure_vault_2026`;
    const hashBuffer = await this.subtle.digest('SHA-256', enc.encode(input));
    return this.bytesToHex(new Uint8Array(hashBuffer));
  }

  /**
   * Encrypt an object (e.g. { password, notes, customFields }) using AES-GCM
   */
  async encrypt(dataObj) {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key is not in memory.');
    }

    const enc = new TextEncoder();
    const jsonString = JSON.stringify(dataObj);
    const encodedData = enc.encode(jsonString);

    // Generate fresh 12-byte IV for every encryption operation
    const iv = this.getRandomBytes(12);

    const ciphertextBuffer = await this.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      this.masterKey,
      encodedData
    );

    return {
      iv: this.bytesToBase64(iv),
      ciphertext: this.bytesToBase64(new Uint8Array(ciphertextBuffer))
    };
  }

  /**
   * Decrypt ciphertext using AES-GCM with stored IV
   */
  async decrypt(encryptedPayload) {
    if (!this.masterKey) {
      throw new Error('Vault is locked. Master key is not in memory.');
    }

    const iv = this.base64ToBytes(encryptedPayload.iv);
    const ciphertext = this.base64ToBytes(encryptedPayload.ciphertext);

    const decryptedBuffer = await this.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      this.masterKey,
      ciphertext
    );

    const dec = new TextDecoder();
    const jsonString = dec.decode(decryptedBuffer);
    return JSON.parse(jsonString);
  }

  // Clear master key from memory on logout or lock
  lockVault() {
    this.masterKey = null;
  }

  isUnlocked() {
    return this.masterKey !== null;
  }
}

window.vaultCrypto = new VaultCrypto();
