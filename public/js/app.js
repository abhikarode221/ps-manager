/**
 * AetherVault - Frontend Application Controller
 * Handles UI events, vault rendering, password generation, security audit,
 * auto-lock timer, and client-side encryption/decryption calls.
 */

(function () {
  'use strict';

  // State
  const state = {
    user: null,
    items: [], // stores decrypted items in memory
    rawItems: [], // stores encrypted server items
    currentCategory: 'all',
    searchQuery: '',
    sortBy: 'updated-desc',
    activeModal: null,
    editingItemId: null,
    autoLockTimer: null,
    autoLockDurationMs: 15 * 60 * 1000, // 15 minutes of inactivity
    userMasterSalt: null,
    onPinSuccessCallback: null
  };

  // DOM Elements
  const els = {
    themeToggle: document.getElementById('btn-theme-toggle'),
    authScreen: document.getElementById('auth-screen'),
    authForm: document.getElementById('auth-form'),
    authTabs: document.getElementById('auth-tabs'),
    authEmail: document.getElementById('auth-email'),
    authPassword: document.getElementById('auth-password'),
    authConfirmPassword: document.getElementById('auth-confirm-password'),
    authSubmitBtn: document.getElementById('auth-submit-btn'),
    toggleAuthPassword: document.getElementById('toggle-auth-password'),
    confirmPasswordGroup: document.getElementById('confirm-password-group'),
    regPinGroup: document.getElementById('reg-pin-group'),
    authRegPin: document.getElementById('auth-reg-pin'),
    authStrengthWrapper: document.getElementById('auth-strength-wrapper'),
    authStrengthFill: document.getElementById('auth-strength-fill'),
    authStrengthText: document.getElementById('auth-strength-text'),
    authDbStatus: document.getElementById('auth-db-status'),
    appDbStatus: document.getElementById('app-db-status'),
    appDbName: document.getElementById('app-db-name'),

    appContainer: document.getElementById('app-container'),
    userAvatar: document.getElementById('user-avatar'),
    userDisplayEmail: document.getElementById('user-display-email'),
    btnLockVault: document.getElementById('btn-lock-vault'),
    btnLogout: document.getElementById('btn-logout'),

    vaultSearchInput: document.getElementById('vault-search-input'),
    navItems: document.querySelectorAll('.nav-item[data-category]'),
    countAll: document.getElementById('count-all'),
    countFavorites: document.getElementById('count-favorites'),
    countLogin: document.getElementById('count-login'),
    countCard: document.getElementById('count-card'),
    countNote: document.getElementById('count-note'),
    countServer: document.getElementById('count-server'),

    viewTitle: document.getElementById('view-title'),
    viewCount: document.getElementById('view-count'),
    filterStatusText: document.getElementById('filter-status-text'),
    sortItems: document.getElementById('sort-items'),
    itemsGrid: document.getElementById('items-grid'),
    emptyState: document.getElementById('empty-state'),
    emptyStateDesc: document.getElementById('empty-state-desc'),
    btnEmptyAdd: document.getElementById('btn-empty-add'),
    btnNewItem: document.getElementById('btn-new-item'),

    // Security PIN Navigation & Modals
    navBtnPinSettings: document.getElementById('nav-btn-pin-settings'),
    pinStatusBadge: document.getElementById('pin-status-badge'),
    pinModal: document.getElementById('pin-modal'),
    pinModalDesc: document.getElementById('pin-modal-desc'),
    pinInputBoxes: document.querySelectorAll('#pin-input-boxes .pin-box'),
    pinErrorMsg: document.getElementById('pin-error-msg'),
    btnSubmitPin: document.getElementById('btn-submit-pin'),
    pinSetupModal: document.getElementById('pin-setup-modal'),
    pinSetupForm: document.getElementById('pin-setup-form'),
    setupPinVal: document.getElementById('setup-pin-val'),
    setupPinConfirm: document.getElementById('setup-pin-confirm'),

    // Security sidebar score
    securityScoreWidget: document.getElementById('security-score-widget'),
    sidebarScoreText: document.getElementById('sidebar-score-text'),
    sidebarScoreFill: document.getElementById('sidebar-score-fill'),

    // Item modal
    itemModal: document.getElementById('item-modal'),
    itemModalTitle: document.getElementById('item-modal-title'),
    itemForm: document.getElementById('item-form'),
    itemTitle: document.getElementById('item-title'),
    itemCategory: document.getElementById('item-category'),
    itemWebsite: document.getElementById('item-website'),
    itemUsername: document.getElementById('item-username'),
    itemPassword: document.getElementById('item-password'),
    itemNotes: document.getElementById('item-notes'),
    itemFavorite: document.getElementById('item-favorite'),
    btnSaveItem: document.getElementById('btn-save-item'),
    btnDeleteItem: document.getElementById('btn-delete-item'),
    btnToggleItemPwd: document.getElementById('btn-toggle-item-pwd'),
    btnCopyPwdInline: document.getElementById('btn-copy-pwd-inline'),
    btnCopyUsernameInline: document.getElementById('btn-copy-username-inline'),
    itemStrengthFill: document.getElementById('item-strength-fill'),
    itemStrengthText: document.getElementById('item-strength-text'),
    btnOpenGenFromItem: document.getElementById('btn-open-gen-from-item'),

    // Generator modal
    generatorModal: document.getElementById('generator-modal'),
    navBtnGenerator: document.getElementById('nav-btn-generator'),
    genOutputText: document.getElementById('gen-output-text'),
    genBtnRefresh: document.getElementById('gen-btn-refresh'),
    genBtnCopy: document.getElementById('gen-btn-copy'),
    genLengthSlider: document.getElementById('gen-length-slider'),
    genLengthVal: document.getElementById('gen-length-val'),
    genOptUpper: document.getElementById('gen-opt-upper'),
    genOptLower: document.getElementById('gen-opt-lower'),
    genOptNums: document.getElementById('gen-opt-nums'),
    genOptSyms: document.getElementById('gen-opt-syms'),
    genOptAmbig: document.getElementById('gen-opt-ambig'),
    btnUseGenerated: document.getElementById('btn-use-generated'),

    // Security Audit modal
    auditModal: document.getElementById('audit-modal'),
    navBtnAudit: document.getElementById('nav-btn-audit'),
    auditBigScore: document.getElementById('audit-big-score'),
    auditWeakCount: document.getElementById('audit-weak-count'),
    auditReusedCount: document.getElementById('audit-reused-count'),
    auditFindingsList: document.getElementById('audit-findings-list'),

    // Export modal
    exportModal: document.getElementById('export-modal'),
    navBtnImportExport: document.getElementById('nav-btn-import-export'),
    btnExportEncrypted: document.getElementById('btn-export-encrypted'),
    btnExportCsv: document.getElementById('btn-export-csv'),

    toastContainer: document.getElementById('toast-container')
  };

  // Toast Notification helper
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${escapeHtml(message)}</span>`;
    els.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 3200);
  }

  // Clipboard copy with feedback
  async function copyToClipboard(text, label = 'Copied to clipboard') {
    if (!text) {
      showToast('Nothing to copy', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast(label, 'success');
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast(label, 'success');
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Password Strength Evaluator
  function evaluatePasswordStrength(password) {
    if (!password) return { score: 0, text: 'Empty', class: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 14) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 1, text: 'Weak', class: 'weak' };
    if (score === 2) return { score: 2, text: 'Fair', class: 'fair' };
    if (score === 3) return { score: 3, text: 'Good', class: 'good' };
    return { score: 4, text: 'Strong', class: 'strong' };
  }

  // Cryptographically secure password generator
  function generatePassword() {
    const length = parseInt(els.genLengthSlider.value, 10);
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const nums = '0123456789';
    const syms = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let pool = '';
    let requiredChars = [];

    if (els.genOptUpper.checked) {
      pool += upper;
      requiredChars.push(upper);
    }
    if (els.genOptLower.checked) {
      pool += lower;
      requiredChars.push(lower);
    }
    if (els.genOptNums.checked) {
      pool += nums;
      requiredChars.push(nums);
    }
    if (els.genOptSyms.checked) {
      pool += syms;
      requiredChars.push(syms);
    }

    if (els.genOptAmbig.checked) {
      const ambig = /[0Oo1lI|]/g;
      pool = pool.replace(ambig, '');
      requiredChars = requiredChars.map(s => s.replace(ambig, ''));
    }

    if (!pool) {
      pool = lower + nums;
      requiredChars.push(lower);
    }

    const randomVals = new Uint32Array(length);
    window.crypto.getRandomValues(randomVals);

    let result = [];
    // Ensure at least one char from each selected group
    requiredChars.forEach(grp => {
      if (grp.length > 0) {
        const randIdx = Math.floor(Math.random() * grp.length);
        result.push(grp[randIdx]);
      }
    });

    for (let i = result.length; i < length; i++) {
      const randIdx = randomVals[i] % pool.length;
      result.push(pool[randIdx]);
    }

    // Shuffle characters
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    const pwd = result.join('');
    els.genOutputText.textContent = pwd;
    return pwd;
  }

  // Inactivity Auto-Lock
  function resetAutoLock() {
    clearTimeout(state.autoLockTimer);
    if (window.vaultCrypto.isUnlocked()) {
      state.autoLockTimer = setTimeout(() => {
        lockVault('Vault automatically locked due to inactivity.');
      }, state.autoLockDurationMs);
    }
  }

  ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    window.addEventListener(event, resetAutoLock, { passive: true });
  });

  // Lock Vault (Wipes keys from memory)
  function lockVault(reason = 'Vault locked.') {
    window.vaultCrypto.lockVault();
    state.items = [];
    state.rawItems = [];
    renderItems();
    els.appContainer.style.display = 'none';
    els.authScreen.style.display = 'flex';
    els.authPassword.value = '';
    if (els.authConfirmPassword) els.authConfirmPassword.value = '';
    showToast(reason, 'info');
  }

  // Auth Tabs (Login vs Register)
  let currentAuthTab = 'login';
  els.authTabs.addEventListener('click', e => {
    const tabBtn = e.target.closest('.auth-tab');
    if (!tabBtn) return;
    currentAuthTab = tabBtn.dataset.tab;
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
    tabBtn.classList.add('active');

    if (currentAuthTab === 'register') {
      els.confirmPasswordGroup.style.display = 'flex';
      els.regPinGroup.style.display = 'flex';
      els.authStrengthWrapper.style.display = 'flex';
      els.authSubmitBtn.textContent = 'Create Secure Vault';
    } else {
      els.confirmPasswordGroup.style.display = 'none';
      els.regPinGroup.style.display = 'none';
      els.authStrengthWrapper.style.display = 'none';
      els.authSubmitBtn.textContent = 'Unlock Vault';
    }
  });

  // Master Password strength update on registration
  els.authPassword.addEventListener('input', () => {
    if (currentAuthTab === 'register') {
      const strength = evaluatePasswordStrength(els.authPassword.value);
      els.authStrengthFill.className = `strength-bar-fill ${strength.class}`;
      els.authStrengthText.textContent = `Strength: ${strength.text}`;
    }
  });

  // Password visibility toggles
  els.toggleAuthPassword.addEventListener('click', () => {
    const isPwd = els.authPassword.type === 'password';
    els.authPassword.type = isPwd ? 'text' : 'password';
  });

  els.btnToggleItemPwd.addEventListener('click', () => {
    const isPwd = els.itemPassword.type === 'password';
    els.itemPassword.type = isPwd ? 'text' : 'password';
  });

  // Item form password strength
  els.itemPassword.addEventListener('input', () => {
    const strength = evaluatePasswordStrength(els.itemPassword.value);
    els.itemStrengthFill.className = `strength-bar-fill ${strength.class}`;
    els.itemStrengthText.textContent = `Strength: ${strength.text}`;
  });

  // Auth Form Submit Handler
  els.authForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = els.authEmail.value.trim().toLowerCase();
    const masterPassword = els.authPassword.value;

    if (!email || !masterPassword) {
      showToast('Please provide email and master password', 'error');
      return;
    }

    els.authSubmitBtn.disabled = true;
    const originalText = els.authSubmitBtn.textContent;
    els.authSubmitBtn.textContent = 'Computing zero-knowledge keys...';

    try {
      if (currentAuthTab === 'register') {
        const confirmPassword = els.authConfirmPassword.value;
        if (masterPassword !== confirmPassword) {
          throw new Error('Master passwords do not match');
        }
        if (masterPassword.length < 8) {
          throw new Error('Master password must be at least 8 characters');
        }

        // Optional 6-digit PIN on registration
        let pinHash = null;
        if (els.authRegPin && els.authRegPin.value) {
          const pinVal = els.authRegPin.value.trim();
          if (pinVal.length !== 6 || !/^\d{6}$/.test(pinVal)) {
            throw new Error('Security PIN must be exactly 6 digits (numbers only)');
          }
        }

        // Generate a new 32-byte master salt on the client
        const saltBytes = window.vaultCrypto.getRandomBytes(32);
        const masterSalt = window.vaultCrypto.bytesToHex(saltBytes);

        // Derive Master Key & Auth Hash
        await window.vaultCrypto.deriveMasterKey(masterPassword, masterSalt);
        const authHash = await window.vaultCrypto.computeAuthHash(masterPassword, masterSalt);

        if (els.authRegPin && els.authRegPin.value) {
          pinHash = await window.vaultCrypto.computePinHash(els.authRegPin.value.trim(), masterSalt);
        }

        // Register user on server
        const res = await window.vaultAPI.register(email, authHash, masterSalt, pinHash);
        state.user = res.user;
        state.userMasterSalt = masterSalt;
        showToast('Vault created successfully!', 'success');
        unlockVaultUI();
      } else {
        // Login Flow:
        // 1. Fetch user's master salt from server
        const saltRes = await window.vaultAPI.getSalt(email);
        if (!saltRes.salt) {
          throw new Error('Vault not found. Please create a vault first.');
        }

        state.userMasterSalt = saltRes.salt;

        // 2. Derive Master Key & Auth Hash locally
        await window.vaultCrypto.deriveMasterKey(masterPassword, saltRes.salt);
        const authHash = await window.vaultCrypto.computeAuthHash(masterPassword, saltRes.salt);

        // 3. Authenticate with server
        const res = await window.vaultAPI.login(email, authHash);
        state.user = res.user;
        showToast('Vault unlocked!', 'success');
        unlockVaultUI();
      }
    } catch (err) {
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      els.authSubmitBtn.disabled = false;
      els.authSubmitBtn.textContent = originalText;
    }
  });

  // Update PIN status badge in sidebar
  function updatePinBadge() {
    if (!els.pinStatusBadge) return;
    if (state.user?.hasPin) {
      els.pinStatusBadge.textContent = 'Active';
      els.pinStatusBadge.style.backgroundColor = 'var(--success)';
      els.pinStatusBadge.style.color = '#fff';
    } else {
      els.pinStatusBadge.textContent = 'Not Set';
      els.pinStatusBadge.style.backgroundColor = 'var(--warning)';
      els.pinStatusBadge.style.color = '#fff';
    }
  }

  // Unlock UI and load vault items
  async function unlockVaultUI() {
    els.authScreen.style.display = 'none';
    els.appContainer.style.display = 'flex';
    els.userDisplayEmail.textContent = state.user?.email || 'User';
    els.userAvatar.textContent = (state.user?.email?.[0] || 'U').toUpperCase();

    updatePinBadge();
    resetAutoLock();
    await loadVaultItems();
  }

  // Load and decrypt vault items from server
  async function loadVaultItems() {
    try {
      const res = await window.vaultAPI.getItems();
      state.rawItems = res.items || [];
      state.items = [];

      // Decrypt all items in client browser
      for (const item of state.rawItems) {
        try {
          const decrypted = await window.vaultCrypto.decrypt(item.encryptedData);
          state.items.push({
            id: item._id || item.id,
            title: item.title,
            category: item.category || 'login',
            favorite: Boolean(item.favorite),
            website: item.website || '',
            username: item.username || '',
            password: decrypted.password || '',
            notes: decrypted.notes || '',
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
          });
        } catch (decryptErr) {
          console.error('Failed to decrypt item:', item.title, decryptErr);
          state.items.push({
            id: item._id || item.id,
            title: item.title + ' (Decryption Error)',
            category: item.category || 'login',
            favorite: false,
            website: '',
            username: '',
            password: '',
            notes: 'Unable to decrypt with current master key.',
            error: true
          });
        }
      }

      updateSidebarCounts();
      renderItems();
      updateSecurityAudit();
    } catch (err) {
      showToast('Error loading vault: ' + err.message, 'error');
    }
  }

  // Update counts in sidebar
  function updateSidebarCounts() {
    const total = state.items.length;
    const favs = state.items.filter(i => i.favorite).length;
    const logins = state.items.filter(i => i.category === 'login').length;
    const cards = state.items.filter(i => i.category === 'card').length;
    const notes = state.items.filter(i => i.category === 'note').length;
    const servers = state.items.filter(i => i.category === 'server').length;

    els.countAll.textContent = total;
    els.countFavorites.textContent = favs;
    els.countLogin.textContent = logins;
    els.countCard.textContent = cards;
    els.countNote.textContent = notes;
    els.countServer.textContent = servers;
  }

  // Filter & Sort Items
  function getFilteredItems() {
    return state.items.filter(item => {
      // Category filter
      if (state.currentCategory === 'favorites' && !item.favorite) return false;
      if (state.currentCategory !== 'all' && state.currentCategory !== 'favorites') {
        if (item.category !== state.currentCategory) return false;
      }

      // Search query
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesUser = item.username?.toLowerCase().includes(q);
        const matchesWeb = item.website?.toLowerCase().includes(q);
        const matchesNotes = item.notes?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesUser && !matchesWeb && !matchesNotes) return false;
      }

      return true;
    }).sort((a, b) => {
      if (state.sortBy === 'title-asc') return (a.title || '').localeCompare(b.title || '');
      if (state.sortBy === 'title-desc') return (b.title || '').localeCompare(a.title || '');
      if (state.sortBy === 'created-desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0); // updated-desc
    });
  }

  // Render items grid
  function renderItems() {
    const filtered = getFilteredItems();
    els.itemsGrid.innerHTML = '';

    const catName = state.currentCategory === 'all' ? 'All Items' :
      state.currentCategory === 'favorites' ? 'Favorites' :
      state.currentCategory.charAt(0).toUpperCase() + state.currentCategory.slice(1);
    
    els.viewTitle.textContent = catName;
    els.viewCount.textContent = `${filtered.length} item${filtered.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
      els.emptyState.style.display = 'flex';
      els.itemsGrid.style.display = 'none';
      if (state.searchQuery) {
        els.emptyStateDesc.textContent = `No passwords match "${state.searchQuery}".`;
      } else {
        els.emptyStateDesc.textContent = `No items in ${catName.toLowerCase()} yet.`;
      }
      return;
    }

    els.emptyState.style.display = 'none';
    els.itemsGrid.style.display = 'grid';

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'item-card';

      // Category / site initial or icon
      const initial = (item.title || 'P').charAt(0).toUpperCase();

      card.innerHTML = `
        <div class="item-card-top">
          <div class="item-icon-title">
            <div class="item-icon">${initial}</div>
            <div class="item-info">
              <div class="item-title">${escapeHtml(item.title)}</div>
              <div class="item-username">${escapeHtml(item.username || item.website || 'No username')}</div>
            </div>
          </div>
          <div class="item-actions">
            <button class="fav-star ${item.favorite ? 'active' : ''}" data-fav-id="${item.id}" title="${item.favorite ? 'Unstar' : 'Star'}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${item.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>
          </div>
        </div>

        <div class="item-card-bottom">
          <span class="item-category-tag">${escapeHtml(item.category)}</span>
          <div style="display: flex; gap: 6px;">
            ${item.username ? `
              <button class="quick-copy-btn" data-copy-user="${escapeHtml(item.username)}" title="Copy Username">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Copy User
              </button>
            ` : ''}
            ${item.password ? `
              <button class="quick-copy-btn" data-copy-pwd="${escapeHtml(item.password)}" title="Copy Password">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy Password
              </button>
            ` : ''}
          </div>
        </div>
      `;

      // Click card to open edit modal (requires PIN for saved item)
      card.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        requirePin(() => {
          openItemModal(item);
        }, `Enter your 6-digit PIN to open and view "${item.title}".`);
      });

      // Quick copy button handlers
      const copyPwdBtn = card.querySelector('[data-copy-pwd]');
      if (copyPwdBtn) {
        copyPwdBtn.addEventListener('click', e => {
          e.stopPropagation();
          requirePin(() => {
            copyToClipboard(item.password, `Password copied for ${item.title}`);
          }, `Enter your 6-digit PIN to copy password for "${item.title}".`);
        });
      }

      const copyUserBtn = card.querySelector('[data-copy-user]');
      if (copyUserBtn) {
        copyUserBtn.addEventListener('click', e => {
          e.stopPropagation();
          copyToClipboard(item.username, `Username copied for ${item.title}`);
        });
      }

      // Star favorite button handler
      const favBtn = card.querySelector('[data-fav-id]');
      if (favBtn) {
        favBtn.addEventListener('click', async e => {
          e.stopPropagation();
          try {
            await window.vaultAPI.toggleFavorite(item.id);
            item.favorite = !item.favorite;
            updateSidebarCounts();
            renderItems();
          } catch (err) {
            showToast('Failed to update favorite: ' + err.message, 'error');
          }
        });
      }

      els.itemsGrid.appendChild(card);
    });
  }

  // Open Item Modal (Create or Edit)
  function openItemModal(item = null) {
    state.editingItemId = item ? item.id : null;
    els.itemModalTitle.textContent = item ? 'Edit Vault Item' : 'New Vault Item';
    els.btnDeleteItem.style.display = item ? 'inline-flex' : 'none';

    els.itemTitle.value = item?.title || '';
    els.itemCategory.value = item?.category || (state.currentCategory !== 'all' && state.currentCategory !== 'favorites' ? state.currentCategory : 'login');
    els.itemWebsite.value = item?.website || '';
    els.itemUsername.value = item?.username || '';
    els.itemPassword.value = item?.password || '';
    els.itemPassword.type = 'password';
    els.itemNotes.value = item?.notes || '';
    els.itemFavorite.checked = Boolean(item?.favorite);

    const strength = evaluatePasswordStrength(item?.password || '');
    els.itemStrengthFill.className = `strength-bar-fill ${strength.class}`;
    els.itemStrengthText.textContent = `Strength: ${strength.text}`;

    openModal(els.itemModal);
  }

  // Save Item (Encrypts locally using AES-GCM and sends ciphertext to server)
  els.itemForm.addEventListener('submit', async e => {
    e.preventDefault();
    const title = els.itemTitle.value.trim();
    if (!title) {
      showToast('Title is required', 'error');
      return;
    }

    els.btnSaveItem.disabled = true;
    els.btnSaveItem.textContent = 'Encrypting & Saving...';

    try {
      const payloadToEncrypt = {
        password: els.itemPassword.value,
        notes: els.itemNotes.value
      };

      // Encrypt sensitive payload using Master Key in memory
      const encryptedData = await window.vaultCrypto.encrypt(payloadToEncrypt);

      const itemData = {
        title: title,
        category: els.itemCategory.value,
        website: els.itemWebsite.value.trim(),
        username: els.itemUsername.value.trim(),
        favorite: els.itemFavorite.checked,
        encryptedData: encryptedData
      };

      if (state.editingItemId) {
        await window.vaultAPI.updateItem(state.editingItemId, itemData);
        showToast('Item updated and encrypted!', 'success');
      } else {
        await window.vaultAPI.createItem(itemData);
        showToast('New item encrypted and saved!', 'success');
      }

      closeModal(els.itemModal);
      await loadVaultItems();
    } catch (err) {
      showToast('Error saving item: ' + err.message, 'error');
    } finally {
      els.btnSaveItem.disabled = false;
      els.btnSaveItem.textContent = 'Save Item';
    }
  });

  // Delete Item
  els.btnDeleteItem.addEventListener('click', async () => {
    if (!state.editingItemId) return;
    if (!confirm('Are you sure you want to permanently delete this item?')) return;

    try {
      await window.vaultAPI.deleteItem(state.editingItemId);
      showToast('Item deleted from vault', 'success');
      closeModal(els.itemModal);
      await loadVaultItems();
    } catch (err) {
      showToast('Error deleting item: ' + err.message, 'error');
    }
  });

  // Inline copy buttons in item modal
  els.btnCopyPwdInline.addEventListener('click', () => {
    copyToClipboard(els.itemPassword.value, 'Password copied');
  });

  els.btnCopyUsernameInline.addEventListener('click', () => {
    copyToClipboard(els.itemUsername.value, 'Username copied');
  });

  // Launch generator from inside item modal
  els.btnOpenGenFromItem.addEventListener('click', () => {
    generatePassword();
    openModal(els.generatorModal);
  });

  // ==========================================
  // 6-Digit Security PIN Verification & Setup
  // ==========================================

  // Request 6-digit PIN verification before opening or revealing saved password
  function requirePin(onSuccess, promptDesc = 'Enter your 6-digit PIN to unlock and view this saved password.') {
    // If user has not set up a PIN yet, prompt them to set one up first!
    if (!state.user?.hasPin) {
      openPinSetupModal(() => {
        onSuccess();
      });
      return;
    }

    state.onPinSuccessCallback = onSuccess;
    if (els.pinModalDesc) {
      els.pinModalDesc.textContent = promptDesc;
    }
    if (els.pinErrorMsg) {
      els.pinErrorMsg.textContent = '';
    }

    // Reset pin boxes
    els.pinInputBoxes.forEach(box => {
      box.value = '';
      box.classList.remove('filled');
    });

    openModal(els.pinModal);

    // Auto-focus first box
    setTimeout(() => {
      if (els.pinInputBoxes[0]) els.pinInputBoxes[0].focus();
    }, 150);
  }

  // Handle PIN boxes typing, backspace, and paste
  els.pinInputBoxes.forEach((box, index) => {
    box.addEventListener('input', e => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      box.value = val ? val[0] : '';

      if (box.value) {
        box.classList.add('filled');
        if (index < els.pinInputBoxes.length - 1) {
          els.pinInputBoxes[index + 1].focus();
        } else {
          // 6th digit entered! Automatically trigger PIN verification
          submitPin();
        }
      } else {
        box.classList.remove('filled');
      }
    });

    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && index > 0) {
        els.pinInputBoxes[index - 1].focus();
      } else if (e.key === 'Enter') {
        submitPin();
      }
    });

    box.addEventListener('paste', e => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
      if (pasteData.length > 0) {
        for (let i = 0; i < els.pinInputBoxes.length; i++) {
          if (i < pasteData.length) {
            els.pinInputBoxes[i].value = pasteData[i];
            els.pinInputBoxes[i].classList.add('filled');
          }
        }
        const nextIdx = Math.min(pasteData.length, els.pinInputBoxes.length - 1);
        els.pinInputBoxes[nextIdx].focus();
        if (pasteData.length >= 6) {
          submitPin();
        }
      }
    });
  });

  // Submit and verify entered PIN
  async function submitPin() {
    const pin = Array.from(els.pinInputBoxes).map(b => b.value).join('');
    if (pin.length !== 6) {
      if (els.pinErrorMsg) els.pinErrorMsg.textContent = 'Please enter all 6 digits';
      return;
    }

    els.btnSubmitPin.disabled = true;
    els.btnSubmitPin.textContent = 'Verifying...';
    if (els.pinErrorMsg) els.pinErrorMsg.textContent = '';

    try {
      if (!state.userMasterSalt) {
        const saltRes = await window.vaultAPI.getSalt(state.user.email);
        state.userMasterSalt = saltRes.salt;
      }

      const pinHash = await window.vaultCrypto.computePinHash(pin, state.userMasterSalt);
      await window.vaultAPI.verifyPin(pinHash);

      // PIN is valid!
      closeModal(els.pinModal);
      showToast('PIN verified — password unlocked', 'success');

      if (typeof state.onPinSuccessCallback === 'function') {
        const cb = state.onPinSuccessCallback;
        state.onPinSuccessCallback = null;
        cb();
      }
    } catch (err) {
      // Shake animation
      const container = document.getElementById('pin-input-boxes');
      if (container) {
        container.classList.remove('pin-shake');
        void container.offsetWidth; // trigger reflow
        container.classList.add('pin-shake');
      }

      if (els.pinErrorMsg) {
        els.pinErrorMsg.textContent = err.message || 'Incorrect 6-digit PIN. Please try again.';
      }

      // Clear boxes and focus first box
      els.pinInputBoxes.forEach(b => {
        b.value = '';
        b.classList.remove('filled');
      });
      if (els.pinInputBoxes[0]) els.pinInputBoxes[0].focus();
    } finally {
      els.btnSubmitPin.disabled = false;
      els.btnSubmitPin.textContent = 'Unlock Password';
    }
  }

  els.btnSubmitPin.addEventListener('click', submitPin);

  // Setup / Change PIN modal logic
  function openPinSetupModal(onSuccessCallback = null) {
    state.onPinSetupSuccessCallback = onSuccessCallback;
    els.setupPinVal.value = '';
    els.setupPinConfirm.value = '';
    openModal(els.pinSetupModal);
  }

  if (els.navBtnPinSettings) {
    els.navBtnPinSettings.addEventListener('click', () => {
      openPinSetupModal();
    });
  }

  els.pinSetupForm.addEventListener('submit', async e => {
    e.preventDefault();
    const pin = els.setupPinVal.value.trim();
    const confirmPin = els.setupPinConfirm.value.trim();

    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      showToast('PIN must be exactly 6 digits (numbers only)', 'error');
      return;
    }
    if (pin !== confirmPin) {
      showToast('6-digit PINs do not match', 'error');
      return;
    }

    try {
      if (!state.userMasterSalt) {
        const saltRes = await window.vaultAPI.getSalt(state.user.email);
        state.userMasterSalt = saltRes.salt;
      }

      const pinHash = await window.vaultCrypto.computePinHash(pin, state.userMasterSalt);
      await window.vaultAPI.setPin(pinHash);

      if (state.user) state.user.hasPin = true;
      updatePinBadge();
      closeModal(els.pinSetupModal);
      showToast('6-digit PIN saved successfully!', 'success');

      if (typeof state.onPinSetupSuccessCallback === 'function') {
        const cb = state.onPinSetupSuccessCallback;
        state.onPinSetupSuccessCallback = null;
        cb();
      }
    } catch (err) {
      showToast('Failed to save PIN: ' + err.message, 'error');
    }
  });

  // Modal helper functions
  function openModal(modal) {
    state.activeModal = modal;
    modal.classList.add('active');
  }

  function closeModal(modal) {
    modal.classList.remove('active');
    state.activeModal = null;
  }

  // Close modals on clicking overlay or [data-close]
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      const target = document.getElementById(modalId);
      if (target) closeModal(target);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        closeModal(overlay);
      }
    });
  });

  // Generator modal events
  els.navBtnGenerator.addEventListener('click', () => {
    generatePassword();
    openModal(els.generatorModal);
  });

  els.genBtnRefresh.addEventListener('click', generatePassword);

  els.genBtnCopy.addEventListener('click', () => {
    copyToClipboard(els.genOutputText.textContent, 'Generated password copied');
  });

  els.genLengthSlider.addEventListener('input', () => {
    els.genLengthVal.textContent = els.genLengthSlider.value;
    generatePassword();
  });

  [els.genOptUpper, els.genOptLower, els.genOptNums, els.genOptSyms, els.genOptAmbig].forEach(opt => {
    opt.addEventListener('change', generatePassword);
  });

  els.btnUseGenerated.addEventListener('click', () => {
    const pwd = els.genOutputText.textContent;
    copyToClipboard(pwd, 'Password copied');
    if (els.itemModal.classList.contains('active')) {
      els.itemPassword.value = pwd;
      const strength = evaluatePasswordStrength(pwd);
      els.itemStrengthFill.className = `strength-bar-fill ${strength.class}`;
      els.itemStrengthText.textContent = `Strength: ${strength.text}`;
    }
    closeModal(els.generatorModal);
  });

  // Security Audit calculation & modal
  function updateSecurityAudit() {
    if (state.items.length === 0) {
      els.sidebarScoreText.textContent = '100%';
      els.sidebarScoreFill.style.width = '100%';
      els.sidebarScoreFill.style.backgroundColor = 'var(--success)';
      return;
    }

    const weakItems = [];
    const passwordMap = new Map();

    state.items.forEach(item => {
      if (!item.password) return;
      const strength = evaluatePasswordStrength(item.password);
      if (strength.score < 3 || item.password.length < 10) {
        weakItems.push(item);
      }
      const existing = passwordMap.get(item.password) || [];
      existing.push(item);
      passwordMap.set(item.password, existing);
    });

    const reusedGroups = Array.from(passwordMap.values()).filter(grp => grp.length > 1);
    const reusedItemsCount = reusedGroups.reduce((acc, grp) => acc + grp.length, 0);

    // Compute health score (0 to 100)
    let penalty = (weakItems.length * 15) + (reusedItemsCount * 12);
    let score = Math.max(10, Math.min(100, 100 - penalty));

    els.sidebarScoreText.textContent = `${score}%`;
    els.sidebarScoreFill.style.width = `${score}%`;

    if (score >= 80) {
      els.sidebarScoreFill.style.backgroundColor = 'var(--success)';
      els.sidebarScoreText.style.color = 'var(--success)';
      els.auditBigScore.style.color = 'var(--success)';
    } else if (score >= 50) {
      els.sidebarScoreFill.style.backgroundColor = 'var(--warning)';
      els.sidebarScoreText.style.color = 'var(--warning)';
      els.auditBigScore.style.color = 'var(--warning)';
    } else {
      els.sidebarScoreFill.style.backgroundColor = 'var(--danger)';
      els.sidebarScoreText.style.color = 'var(--danger)';
      els.auditBigScore.style.color = 'var(--danger)';
    }

    els.auditBigScore.textContent = `${score}%`;
    els.auditWeakCount.textContent = weakItems.length;
    els.auditReusedCount.textContent = reusedItemsCount;

    // Render findings list
    els.auditFindingsList.innerHTML = '';
    if (weakItems.length === 0 && reusedGroups.length === 0) {
      els.auditFindingsList.innerHTML = `
        <div style="font-size: 0.85rem; color: var(--success); padding: 12px; background: var(--success-bg); border-radius: var(--radius-sm); text-align: center;">
          ✓ Great job! All saved passwords are strong and unique.
        </div>
      `;
    } else {
      weakItems.forEach(item => {
        const row = document.createElement('div');
        row.style.cssText = 'background: var(--bg-tertiary); padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem;';
        row.innerHTML = `
          <div>
            <strong style="color: var(--danger); font-size: 0.75rem;">WEAK PASSWORD:</strong> ${escapeHtml(item.title)}
          </div>
          <button class="btn btn-outline" style="padding: 2px 8px; font-size: 0.75rem;">Update</button>
        `;
        row.querySelector('button').addEventListener('click', () => {
          closeModal(els.auditModal);
          requirePin(() => openItemModal(item), `Enter your 6-digit PIN to open and update "${item.title}".`);
        });
        els.auditFindingsList.appendChild(row);
      });

      reusedGroups.forEach(grp => {
        const titles = grp.map(i => escapeHtml(i.title)).join(', ');
        const row = document.createElement('div');
        row.style.cssText = 'background: var(--bg-tertiary); padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem;';
        row.innerHTML = `
          <div>
            <strong style="color: var(--warning); font-size: 0.75rem;">REUSED PASSWORD:</strong> ${titles}
          </div>
          <button class="btn btn-outline" style="padding: 2px 8px; font-size: 0.75rem;">Update</button>
        `;
        row.querySelector('button').addEventListener('click', () => {
          closeModal(els.auditModal);
          requirePin(() => openItemModal(grp[0]), `Enter your 6-digit PIN to open and update "${grp[0].title}".`);
        });
        els.auditFindingsList.appendChild(row);
      });
    }
  }

  els.securityScoreWidget.addEventListener('click', () => {
    updateSecurityAudit();
    openModal(els.auditModal);
  });
  els.navBtnAudit.addEventListener('click', () => {
    updateSecurityAudit();
    openModal(els.auditModal);
  });

  // Export & Backup
  els.navBtnImportExport.addEventListener('click', () => openModal(els.exportModal));

  els.btnExportEncrypted.addEventListener('click', () => {
    const backupData = {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      user: state.user?.email,
      items: state.rawItems
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AetherVault-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Encrypted backup downloaded', 'success');
  });

  els.btnExportCsv.addEventListener('click', () => {
    if (!confirm('Warning: This will export all your passwords in unencrypted plain text. Proceed?')) return;
    let csv = 'Title,Category,Website,Username,Password,Notes\n';
    state.items.forEach(i => {
      const escapeCsv = val => `"${(val || '').replace(/"/g, '""')}"`;
      csv += `${escapeCsv(i.title)},${escapeCsv(i.category)},${escapeCsv(i.website)},${escapeCsv(i.username)},${escapeCsv(i.password)},${escapeCsv(i.notes)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AetherVault-Plaintext-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV export downloaded', 'info');
  });

  // Category navigation click handlers
  els.navItems.forEach(item => {
    item.addEventListener('click', () => {
      els.navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      state.currentCategory = item.dataset.category;
      renderItems();
    });
  });

  // Search input handler
  els.vaultSearchInput.addEventListener('input', e => {
    state.searchQuery = e.target.value.trim();
    renderItems();
  });

  // Keyboard shortcut '/' to focus search
  window.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== els.vaultSearchInput && !state.activeModal) {
      e.preventDefault();
      els.vaultSearchInput.focus();
    }
  });

  // Sort dropdown
  els.sortItems.addEventListener('change', e => {
    state.sortBy = e.target.value;
    renderItems();
  });

  // New item buttons
  els.btnNewItem.addEventListener('click', () => openItemModal());
  els.btnEmptyAdd.addEventListener('click', () => openItemModal());

  // Lock and Logout buttons
  els.btnLockVault.addEventListener('click', () => lockVault('Vault locked by user'));
  els.btnLogout.addEventListener('click', () => {
    window.vaultAPI.setAuth(null, null);
    lockVault('Signed out of vault');
  });

  // Theme Toggle (Dark / Light)
  const currentTheme = localStorage.getItem('vault_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);

  els.themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('vault_theme', nextTheme);
  });

  // Check Database & System status
  async function checkSystemStatus() {
    try {
      const res = await window.vaultAPI.getSystemStatus();
      const dbType = res.database || 'MongoDB';
      const isConnected = res.connected;

      const dotClass = isConnected ? 'status-dot' : 'status-dot warning';
      const statusText = isConnected ? dbType : `${dbType} (Fallback)`;

      els.authDbStatus.innerHTML = `<span class="${dotClass}"></span> ${statusText}`;
      els.appDbStatus.innerHTML = `<span class="${dotClass}"></span> <span id="app-db-name">${statusText}</span>`;
    } catch {
      els.authDbStatus.innerHTML = `<span class="status-dot warning"></span> Offline mode`;
    }
  }

  // Initial check on load
  checkSystemStatus();
  generatePassword();

})();
