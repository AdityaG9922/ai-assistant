/**
 * Syntax Surge — UI Controller
 * Handles: navigation, titlebar controls, settings load/save, panel switching
 */

document.addEventListener('DOMContentLoaded', () => {
  initTitlebar();
  initNavigation();
  initModeChips();
  loadSettings();
  initSettingsForm();
  initVoiceSpeedSlider();
});

// ── Titlebar window controls ───────────────────────────────────────────────
function initTitlebar() {
  document.getElementById('min-btn')?.addEventListener('click', () => {
    window.electronAPI?.minimizeWindow();
  });

  document.getElementById('max-btn')?.addEventListener('click', () => {
    window.electronAPI?.maximizeWindow();
  });

  document.getElementById('close-btn')?.addEventListener('click', () => {
    window.electronAPI?.closeWindow();
  });

  document.getElementById('settings-btn')?.addEventListener('click', () => {
    switchPanel('settings');
    setActiveNav('settings');
  });
}

// ── Panel navigation ───────────────────────────────────────────────────────
function initNavigation() {
  document.querySelectorAll('.nav-btn[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      switchPanel(section);
      setActiveNav(section);
    });
  });
}

function switchPanel(name) {
  document.querySelectorAll('.panel').forEach(panel => {
    panel.classList.add('hidden');
  });

  const target = document.getElementById(`panel-${name}`);
  if (target) {
    target.classList.remove('hidden');
  }
}

function setActiveNav(name) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.section === name) btn.classList.add('active');
  });
}

// ── Mode chips ─────────────────────────────────────────────────────────────
function initModeChips() {
  document.querySelectorAll('.mode-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.mode-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const mode = chip.dataset.mode;
      if (window.chatEngine) window.chatEngine.currentMode = mode;
    });
  });
}

// ── Load settings into form ────────────────────────────────────────────────
async function loadSettings() {
  try {
    const settings = await window.electronAPI?.getSettings?.();
    if (!settings) return;

    // Show placeholder dots for existing keys (never show actual key)
    if (settings.openaiKey) {
      const el = document.getElementById('s-openai-key');
      if (el) el.placeholder = '●●●●●●●●●●●● (saved)';
    }
    if (settings.claudeKey) {
      const el = document.getElementById('s-claude-key');
      if (el) el.placeholder = '●●●●●●●●●●●● (saved)';
    }
    if (settings.geminiKey) {
      const el = document.getElementById('s-gemini-key');
      if (el) el.placeholder = '●●●●●●●●●●●● (saved)';
    }

    // Primary provider
    const primaryEl = document.getElementById('s-primary');
    if (primaryEl && settings.primaryProvider) {
      primaryEl.value = settings.primaryProvider;
    }

    // Voice speed
    const speedEl = document.getElementById('s-voice-speed');
    const speedValEl = document.getElementById('s-voice-speed-val');
    if (speedEl && settings.voiceSpeed) {
      speedEl.value = settings.voiceSpeed;
      if (speedValEl) speedValEl.textContent = `${settings.voiceSpeed}×`;
    }
  } catch (err) {
    console.error('[UI] Failed to load settings:', err);
  }
}

// ── Save settings form ─────────────────────────────────────────────────────
function initSettingsForm() {
  document.getElementById('save-settings-btn')?.addEventListener('click', async () => {
    const updates = {};

    // Only update keys if user typed something new
    const openaiKey = document.getElementById('s-openai-key')?.value?.trim();
    const claudeKey = document.getElementById('s-claude-key')?.value?.trim();
    const geminiKey = document.getElementById('s-gemini-key')?.value?.trim();

    if (openaiKey) updates.openaiKey = openaiKey;
    if (claudeKey) updates.claudeKey = claudeKey;
    if (geminiKey) updates.geminiKey = geminiKey;

    const primary = document.getElementById('s-primary')?.value;
    if (primary) updates.primaryProvider = primary;

    const speed = parseFloat(document.getElementById('s-voice-speed')?.value || '1');
    if (!isNaN(speed)) updates.voiceSpeed = speed;

    try {
      const result = await window.electronAPI?.saveSettings?.(updates);
      const statusEl = document.getElementById('save-status');

      if (statusEl) {
        if (result?.success) {
          statusEl.textContent = '✓ Settings saved';
          statusEl.style.color = 'var(--neon-cyan)';
        } else {
          statusEl.textContent = '✕ Save failed';
          statusEl.style.color = 'var(--neon-pink)';
        }
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
      }

      // Clear key inputs after save
      if (openaiKey) document.getElementById('s-openai-key').value = '';
      if (claudeKey) document.getElementById('s-claude-key').value = '';
      if (geminiKey) document.getElementById('s-gemini-key').value = '';

      await loadSettings();
    } catch (err) {
      console.error('[UI] Save settings failed:', err);
    }
  });
}

// ── Voice speed slider live update ─────────────────────────────────────────
function initVoiceSpeedSlider() {
  const slider = document.getElementById('s-voice-speed');
  const display = document.getElementById('s-voice-speed-val');

  slider?.addEventListener('input', () => {
    if (display) display.textContent = `${parseFloat(slider.value).toFixed(1)}×`;
  });
}
