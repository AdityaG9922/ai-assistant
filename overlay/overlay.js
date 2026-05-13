/**
 * Syntax Surge — Overlay Logic
 * Manages voice activation, transcript display, and IPC to main window.
 */

let voice = null;
let finalTranscript = '';
let isListening = false;

const orbEl       = document.getElementById('main-orb');
const statusEl    = document.getElementById('overlay-status');
const transcriptEl = document.getElementById('transcript-text');
const waveformEl  = document.getElementById('waveform');
const micBtn      = document.getElementById('mic-btn');
const sendBtn     = document.getElementById('send-btn');
const closeBtn    = document.getElementById('overlay-close');
const shell       = document.getElementById('overlay-shell');

// ── Initialize voice ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (window.VoiceProcessor) {
    voice = new window.VoiceProcessor();

    voice.onStart = () => {
      isListening = true;
      setListeningState(true);
    };

    voice.onResult = ({ final, interim }) => {
      if (final) {
        finalTranscript = final;
        transcriptEl.textContent = final;
        transcriptEl.classList.remove('interim');
        sendBtn.disabled = false;
      } else if (interim) {
        transcriptEl.textContent = interim;
        transcriptEl.classList.add('interim');
      }
    };

    voice.onEnd = () => {
      isListening = false;
      setListeningState(false);

      if (finalTranscript.trim()) {
        sendBtn.disabled = false;
        statusEl.textContent = 'Ready to send';
      }
    };

    voice.onError = (err) => {
      isListening = false;
      setListeningState(false);
      if (err === 'not-allowed') {
        statusEl.textContent = 'Microphone access denied';
      } else if (err !== 'no-speech') {
        statusEl.textContent = `Error: ${err}`;
      } else {
        statusEl.textContent = 'No speech detected. Try again.';
      }
    };
  } else {
    statusEl.textContent = 'Voice not supported';
    micBtn.disabled = true;
  }
});

// ── Listen for overlay show/hide from main ─────────────────────────────────
window.electronAPI?.onOverlayActivated?.(() => {
  // Reset state
  finalTranscript = '';
  transcriptEl.textContent = '';
  statusEl.textContent = 'Press Speak or tap the orb';
  sendBtn.disabled = true;
  shell.classList.remove('closing');

  // Auto-start listening
  setTimeout(() => {
    if (voice) voice.startListening();
  }, 400);
});

window.electronAPI?.onOverlayDeactivated?.(() => {
  shell.classList.add('closing');
  if (voice) voice.stopListening();
});

// ── Orb click: toggle listening ────────────────────────────────────────────
orbEl?.addEventListener('click', () => {
  if (!voice) return;

  if (isListening) {
    voice.stopListening();
  } else {
    finalTranscript = '';
    transcriptEl.textContent = '';
    sendBtn.disabled = true;
    voice.startListening();
  }
});

// ── Mic button ─────────────────────────────────────────────────────────────
micBtn?.addEventListener('click', () => {
  if (!voice) return;

  if (isListening) {
    voice.stopListening();
  } else {
    finalTranscript = '';
    transcriptEl.textContent = '';
    sendBtn.disabled = true;
    voice.startListening();
  }
});

// ── Send button ────────────────────────────────────────────────────────────
sendBtn?.addEventListener('click', () => {
  const text = finalTranscript.trim();
  if (!text) return;

  // Send to main window and close overlay
  window.electronAPI?.sendVoiceResult?.(text);
  finalTranscript = '';
  transcriptEl.textContent = '';
  sendBtn.disabled = true;
});

// ── Close button ───────────────────────────────────────────────────────────
closeBtn?.addEventListener('click', () => {
  if (voice) voice.stopListening();
  window.electronAPI?.hideOverlay?.();
});

// ── Keyboard shortcuts ─────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  // Enter: send if text available
  if (e.key === 'Enter' && !sendBtn.disabled) {
    sendBtn.click();
  }

  // Space: toggle listen
  if (e.key === ' ' && e.target === document.body) {
    e.preventDefault();
    if (isListening) {
      voice?.stopListening();
    } else {
      micBtn?.click();
    }
  }
});

// ── Visual states ──────────────────────────────────────────────────────────
function setListeningState(active) {
  orbEl?.classList.toggle('listening', active);
  waveformEl?.classList.toggle('active', active);

  if (active) {
    statusEl.textContent = 'Listening…';
    micBtn?.classList.add('active');
    micBtn.innerHTML = '<span class="ov-btn-icon">⏹</span><span>Stop</span>';
  } else {
    statusEl.textContent = finalTranscript ? 'Tap Send or speak again' : 'Press Speak to start';
    micBtn?.classList.remove('active');
    micBtn.innerHTML = '<span class="ov-btn-icon">🎙</span><span>Speak</span>';
  }
}
