# 🔒 AetherVault — Secure & Minimalist Password Manager

A fast, clean, and secure web-based password manager built with **Node.js**, **Express**, **Web Crypto API (AES-256-GCM & PBKDF2)**, and **MongoDB**.

---

## ✨ Features

- **🛡️ Zero-Knowledge Architecture**:
  - All encryption and decryption happen **strictly client-side** in your browser using the **Web Crypto API**.
  - Your Master Password is **never transmitted** over the network.
  - The server and database only ever see ciphertext. Even with direct access to MongoDB, no one can read your passwords.
- **🎨 Clean & Minimalist UI**:
  - Distraction-free, responsive design with dark mode and light mode toggle.
  - Quick keyboard search (`/`).
  - Categorization: Logins, Payment Cards, Secure Notes, and API/Server Keys.
  - Star favorite items for rapid access.
- **⚡ Built-in Password Generator**:
  - Cryptographically secure (`crypto.getRandomValues`).
  - Customizable character sets (uppercase, lowercase, numbers, symbols, ambiguous character exclusion).
  - Configurable lengths from 8 to 64 characters.
- **🩺 Password Health & Security Audit**:
  - Live client-side scan of your vault.
  - Identifies weak passwords (< 10 chars or low entropy) and reused passwords across multiple services.
  - Visual security score with actionable 1-click update shortcuts.
- **🔑 6-Digit Security PIN Verification**:
  - Requires a 6-digit PIN to open, reveal, or copy any saved password.
  - Sleek keypad with auto-advancing digit inputs, keyboard support, paste handling, and animated shake feedback on incorrect attempts.
  - Can be set during initial registration or updated anytime in Security PIN settings.
- **🔒 Inactivity Auto-Lock**:
  - Automatically wipes the master decryption key from memory after inactivity to protect against physical device access.
- **💾 Encrypted Backup & CSV Export**:
  - Download encrypted JSON backups for offline storage.
  - Export plaintext CSV when migrating to other tools.
- **🍃 Dual MongoDB Engine**:
  - Native **Mongoose** connection to local MongoDB (`mongodb://localhost:27017/securevault`) or **MongoDB Atlas**.
  - Built-in zero-downtime local store fallback: works instantly out of the box even before MongoDB is installed or configured!

---

## 🔐 Security Architecture

```
User enters Master Password
            │
            ▼
   PBKDF2 Key Derivation (100,000 iterations + Salt)
            │
            ├──────────────────────────────────────────┐
            ▼                                          ▼
   [Client Master Key]                        [Client Auth Token]
      (AES-256-GCM)                              (SHA-256 Hash)
      *Kept ONLY in Browser Memory*                    │
            │                                          │ (Sent to server)
            ▼                                          ▼
Encrypts & Decrypts Vault Data              Bcrypt Hash & Verification
   (Unique 12-byte IV per item)             (MongoDB User Collection)
```

1. **Master Key**: Generated via PBKDF2 (SHA-256, 100,000 rounds) using a cryptographically random 32-byte salt unique to the user.
2. **Encryption**: AES-256 in GCM (Galois/Counter Mode), which provides both confidentiality and tamper protection via authentication tags.
3. **Authentication**: The client derives a distinct authentication token sent to the server. The server verifies it using `bcrypt` (10 rounds). The server never possesses the encryption key.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v18+ (tested on Node.js v22)
- **MongoDB** (Local instance or free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)

### 2. Installation
```bash
# Clone or navigate into the directory
cd "ps manager"

# Install dependencies (already installed)
npm install
```

### 3. Configure Database
Copy `.env.example` to `.env` or edit the existing `.env`:

```env
PORT=5000

# For local MongoDB:
MONGODB_URI=mongodb://127.0.0.1:27017/securevault

# Or for MongoDB Atlas (Cloud):
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/securevault?retryWrites=true&w=majority

JWT_SECRET=your_super_secret_jwt_key
```

> **Note**: If MongoDB is not running locally yet, the server will automatically use the safe embedded fallback store (`./data/vault_store.json`), allowing you to test immediately with zero configuration!

### 4. Start the Application
```bash
# Start server
npm start

# Or start in development mode with auto-reload:
npm run dev
```

### 5. Open in Your Browser
Visit [http://localhost:5000](http://localhost:5000) in your web browser.

---

## 📂 Project Structure

```
ps manager/
├── .env                    # Environment variables (PORT, MONGODB_URI, JWT_SECRET)
├── .env.example            # Environment template
├── package.json            # Scripts & dependencies
├── README.md               # Project documentation
├── public/                 # Clean & Minimalist Frontend
│   ├── index.html          # Single Page Application
│   ├── css/
│   │   └── style.css       # Clean, modern styles & themes
│   └── js/
│       ├── crypto.js       # Web Crypto API Zero-Knowledge Engine
│       ├── api.js          # REST API Client
│       └── app.js          # UI controller & vault manager
├── src/                    # Backend Server
│   ├── server.js           # Express app & security configuration
│   ├── config/
│   │   └── db.js           # MongoDB / Mongoose connection & fallback store
│   ├── models/
│   │   ├── User.js         # Mongoose User schema (email, authHash, masterSalt)
│   │   └── VaultItem.js    # Mongoose VaultItem schema (encryptedData)
│   ├── middleware/
│   │   └── auth.js         # JWT verification middleware
│   └── routes/
│       ├── auth.js         # Salt retrieval, registration, login
│       └── vault.js        # Encrypted vault items CRUD
└── test/                   # Automated Verification Tests
    ├── test-crypto.js      # Crypto unit test (PBKDF2 & AES-256-GCM)
    ├── verify.js           # Integration API tests
    └── run-test.js         # Headless test runner
```

---

## 🧪 Testing

Run the cryptographic unit test:
```bash
npm test
```
