/**
 * chat.js — Syntax Surge Chat Engine
 * Pure JavaScript | Async/Await | No hardcoded responses
 * Integrates with api-client.js for all AI communication
 */

import { sendMessage, sendSearchQuery, sendMultiAI } from './api-client.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const MODES = Object.freeze({
  CHAT: 'chat',
  SEARCH: 'search',
  MULTI_AI: 'multi-ai',
});

const ANIMATION_TIMINGS = {
  MESSAGE_FADE_IN: 30,      // ms per char for typewriter (not used on large responses)
  SCROLL_DEBOUNCE: 80,
  LOADING_DOT_INTERVAL: 420,
  ERROR_DISMISS: 6000,
};

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  mode: MODES.CHAT,
  isLoading: false,
  messageHistory: [],       // { role, content, timestamp, id }
  activeLoadingEl: null,
  scrollDebounceTimer: null,
  multiAIAgents: ['GPT-4o', 'Gemini Ultra', 'Claude'],  // surfaced from config/backend
};

// ─── DOM References (resolved lazily) ────────────────────────────────────────

const dom = (() => {
  let cache = {};
  const selectors = {
    chatWindow:      '#chat-window',
    inputField:      '#chat-input',
    sendBtn:         '#send-btn',
    modeToggle:      '#mode-toggle',
    multiToggle:     '#multi-ai-toggle',
    searchToggle:    '#search-toggle',
    statusBar:       '#status-bar',
    errorBanner:     '#error-banner',
    errorMsg:        '#error-message',
    errorClose:      '#error-close',
    inputWrapper:    '#input-wrapper',
    charCounter:     '#char-counter',
    agentSelector:   '#agent-selector',
  };

  return new Proxy({}, {
    get(_, key) {
      if (!cache[key] && selectors[key]) {
        cache[key] = document.querySelector(selectors[key]);
      }
      return cache[key] ?? null;
    },
    set(_, key, el) {
      cache[key] = el;
      return true;
    }
  });
})();

// ─── Initialization ───────────────────────────────────────────────────────────

export function initChat() {
  if (!dom.chatWindow || !dom.inputField) {
    console.error('[SyntaxSurge] Required DOM elements not found. Aborting chat init.');
    return;
  }

  bindEvents();
  setMode(MODES.CHAT, { silent: true });
  dom.inputField.focus();
  console.info('[SyntaxSurge] Chat engine initialized.');
}

// ─── Event Binding ────────────────────────────────────────────────────────────

function bindEvents() {
  // Send on button click
  dom.sendBtn?.addEventListener('click', handleSend);

  // Send on Enter, newline on Shift+Enter
  dom.inputField?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Char counter + auto-resize
  dom.inputField?.addEventListener('input', handleInputUpdate);

  // Mode toggles
  dom.searchToggle?.addEventListener('click', () => toggleMode(MODES.SEARCH));
  dom.multiToggle?.addEventListener('click', () => toggleMode(MODES.MULTI_AI));

  // Error banner dismiss
  dom.errorClose?.addEventListener('click', hideError);

  // Scroll: show/hide scroll-to-bottom affordance
  dom.chatWindow?.addEventListener('scroll', onChatScroll, { passive: true });
}

// ─── Input Handling ───────────────────────────────────────────────────────────

function handleInputUpdate() {
  const val = dom.inputField?.value ?? '';

  // Auto-resize textarea
  if (dom.inputField) {
    dom.inputField.style.height = 'auto';
    dom.inputField.style.height = Math.min(dom.inputField.scrollHeight, 200) + 'px';
  }

  // Character counter
  if (dom.charCounter) {
    const len = val.length;
    dom.charCounter.textContent = len > 0 ? `${len}` : '';
    dom.charCounter.classList.toggle('warn', len > 3800);
    dom.charCounter.classList.toggle('over', len > 4000);
  }

  // Enable/disable send button
  if (dom.sendBtn) {
    dom.sendBtn.disabled = val.trim().length === 0 || state.isLoading;
  }
}

// ─── Send Flow ────────────────────────────────────────────────────────────────

async function handleSend() {
  const raw = dom.inputField?.value ?? '';
  const text = raw.trim();

  if (!text || state.isLoading) return;

  clearInput();
  setLoading(true);

  // Append user message to UI
  const userMsg = createMessageObject('user', text);
  state.messageHistory.push(userMsg);
  renderMessage(userMsg);

  // Show loading indicator
  const loadingEl = appendLoadingBubble();
  state.activeLoadingEl = loadingEl;

  try {
    let response;

    switch (state.mode) {
      case MODES.SEARCH:
        response = await sendSearchQuery({ query: text, history: state.messageHistory });
        break;

      case MODES.MULTI_AI:
        response = await sendMultiAI({ message: text, agents: state.multiAIAgents, history: state.messageHistory });
        break;

      case MODES.CHAT:
      default:
        response = await sendMessage({ message: text, history: state.messageHistory });
        break;
    }

    removeLoadingBubble(loadingEl);

    if (state.mode === MODES.MULTI_AI && Array.isArray(response?.replies)) {
      // Multi-AI: render one bubble per agent
      for (const agentReply of response.replies) {
        const agentMsg = createMessageObject('assistant', agentReply.reply, { agent: agentReply.agent });
        state.messageHistory.push(agentMsg);
        renderMessage(agentMsg, { animate: true });
        await sleep(120); // stagger reveals
      }
    } else {
      const reply = response?.reply;
      if (!reply) throw new Error('Empty response from backend.');

      const assistantMsg = createMessageObject('assistant', reply);
      state.messageHistory.push(assistantMsg);
      renderMessage(assistantMsg, { animate: true });
    }

  } catch (err) {
    removeLoadingBubble(loadingEl);
    handleError(err);
    console.error('[SyntaxSurge] Send error:', err);
  } finally {
    state.activeLoadingEl = null;
    setLoading(false);
    scheduleScroll();
  }
}

// ─── Message Objects ──────────────────────────────────────────────────────────

function createMessageObject(role, content, meta = {}) {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,          // 'user' | 'assistant' | 'system'
    content,
    timestamp: new Date(),
    ...meta,
  };
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderMessage(msg, { animate = false } = {}) {
  const el = buildMessageElement(msg, animate);
  dom.chatWindow?.appendChild(el);

  // Trigger entrance animation next frame
  if (animate) {
    requestAnimationFrame(() => el.classList.add('visible'));
  } else {
    el.classList.add('visible');
  }

  scheduleScroll();
  return el;
}

function buildMessageElement(msg, animate) {
  const wrapper = document.createElement('div');
  wrapper.className = `message message--${msg.role}${animate ? ' message--entering' : ''}`;
  wrapper.dataset.id = msg.id;

  if (msg.agent) {
    const agentTag = document.createElement('span');
    agentTag.className = 'message__agent-tag';
    agentTag.textContent = msg.agent;
    wrapper.appendChild(agentTag);
  }

  const bubble = document.createElement('div');
  bubble.className = 'message__bubble';

  // Safely set content — parse markdown-lite for assistant messages
  if (msg.role === 'assistant') {
    bubble.innerHTML = renderMarkdownLite(msg.content);
  } else {
    bubble.textContent = msg.content;
  }

  const meta = document.createElement('div');
  meta.className = 'message__meta';
  meta.textContent = formatTime(msg.timestamp);

  wrapper.appendChild(bubble);
  wrapper.appendChild(meta);

  return wrapper;
}

// ─── Loading Bubble ───────────────────────────────────────────────────────────

function appendLoadingBubble() {
  const wrapper = document.createElement('div');
  wrapper.className = 'message message--assistant message--loading';
  wrapper.setAttribute('aria-live', 'polite');
  wrapper.setAttribute('aria-label', 'AI is thinking');

  const bubble = document.createElement('div');
  bubble.className = 'message__bubble';

  const dots = document.createElement('div');
  dots.className = 'loading-dots';
  dots.innerHTML = '<span></span><span></span><span></span>';

  bubble.appendChild(dots);
  wrapper.appendChild(bubble);
  dom.chatWindow?.appendChild(wrapper);

  requestAnimationFrame(() => wrapper.classList.add('visible'));
  scheduleScroll();

  return wrapper;
}

function removeLoadingBubble(el) {
  if (!el || !el.parentNode) return;
  el.classList.add('message--removing');
  el.addEventListener('animationend', () => el.remove(), { once: true });
  // Fallback removal
  setTimeout(() => el.remove(), 400);
}

// ─── Mode Management ──────────────────────────────────────────────────────────

function toggleMode(targetMode) {
  const next = state.mode === targetMode ? MODES.CHAT : targetMode;
  setMode(next);
}

function setMode(mode, { silent = false } = {}) {
  state.mode = mode;

  // Update toggle button states
  dom.searchToggle?.classList.toggle('active', mode === MODES.SEARCH);
  dom.multiToggle?.classList.toggle('active', mode === MODES.MULTI_AI);

  // Update input placeholder
  const placeholders = {
    [MODES.CHAT]:     'Message Syntax Surge…',
    [MODES.SEARCH]:   'Search the web + AI…',
    [MODES.MULTI_AI]: 'Ask all AIs simultaneously…',
  };
  if (dom.inputField) {
    dom.inputField.placeholder = placeholders[mode] ?? 'Message…';
  }

  // Update status bar
  if (dom.statusBar && !silent) {
    const labels = {
      [MODES.CHAT]:     '● Chat',
      [MODES.SEARCH]:   '◎ Search',
      [MODES.MULTI_AI]: '⬡ Multi-AI',
    };
    dom.statusBar.textContent = labels[mode] ?? '';
    dom.statusBar.className = `status-bar status-bar--${mode}`;
  }

  // Show/hide agent selector for multi-ai
  if (dom.agentSelector) {
    dom.agentSelector.style.display = mode === MODES.MULTI_AI ? 'flex' : 'none';
  }

  if (!silent) dom.inputField?.focus();
}

// ─── Loading State ────────────────────────────────────────────────────────────

function setLoading(isLoading) {
  state.isLoading = isLoading;

  if (dom.sendBtn) dom.sendBtn.disabled = isLoading;
  if (dom.inputField) dom.inputField.disabled = isLoading;
  if (dom.inputWrapper) dom.inputWrapper.classList.toggle('loading', isLoading);
}

// ─── Error Handling ───────────────────────────────────────────────────────────

function handleError(err) {
  const message = getUserFacingError(err);
  showError(message);

  // Also render an error bubble in chat
  const errMsg = createMessageObject('system', message);
  renderMessage(errMsg);
}

function getUserFacingError(err) {
  if (!navigator.onLine) return 'No internet connection. Check your network and try again.';
  if (err?.status === 429) return 'Rate limit reached. Please wait a moment before sending again.';
  if (err?.status === 401) return 'Authentication error. Please refresh and try again.';
  if (err?.status >= 500) return 'The server encountered an error. Please try again shortly.';
  if (err?.message?.toLowerCase().includes('timeout')) return 'Request timed out. Please try again.';
  return err?.message ?? 'Something went wrong. Please try again.';
}

function showError(message) {
  if (!dom.errorBanner || !dom.errorMsg) return;
  dom.errorMsg.textContent = message;
  dom.errorBanner.classList.add('visible');

  clearTimeout(dom.errorBanner._dismissTimer);
  dom.errorBanner._dismissTimer = setTimeout(hideError, ANIMATION_TIMINGS.ERROR_DISMISS);
}

function hideError() {
  dom.errorBanner?.classList.remove('visible');
}

// ─── Scroll ───────────────────────────────────────────────────────────────────

function scheduleScroll() {
  clearTimeout(state.scrollDebounceTimer);
  state.scrollDebounceTimer = setTimeout(scrollToBottom, ANIMATION_TIMINGS.SCROLL_DEBOUNCE);
}

function scrollToBottom() {
  const el = dom.chatWindow;
  if (!el) return;
  el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
}

function onChatScroll() {
  if (!dom.chatWindow) return;
  const { scrollTop, scrollHeight, clientHeight } = dom.chatWindow;
  const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
  dom.chatWindow.classList.toggle('scrolled-up', !isNearBottom);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function clearInput() {
  if (!dom.inputField) return;
  dom.inputField.value = '';
  dom.inputField.style.height = 'auto';
  handleInputUpdate();
}

function formatTime(date) {
  return date instanceof Date
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Minimal safe markdown renderer.
 * Handles: bold, italic, inline code, code blocks, links, line breaks.
 * Does NOT eval or create script tags.
 */
function renderMarkdownLite(text) {
  if (!text) return '';

  // Escape HTML first to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Code blocks (``` ... ```)
  html = html.replace(/```([\w]*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre class="code-block${lang ? ` lang-${lang}` : ''}"><code>${code.trim()}</code></pre>`
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Links — safe, no JS protocol
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export {
  state as chatState,
  setMode,
  handleSend,
  clearInput,
};
