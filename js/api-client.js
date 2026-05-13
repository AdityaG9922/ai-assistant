/**
 * api-client.js — Syntax Surge API Client
 * Pure JavaScript | Async/Await | Production Quality
 * Connects to local backend at http://127.0.0.1:47821
 */

// ─── Configuration ────────────────────────────────────────────────────────────

const CONFIG = Object.freeze({
  BASE_URL:        'http://127.0.0.1:47821',
  TIMEOUT_MS:      30_000,   // 30s default request timeout
  MULTI_AI_TIMEOUT: 60_000,  // 60s for multi-AI (slower aggregate)
  RETRY_ATTEMPTS:  2,
  RETRY_DELAY_MS:  800,
  RETRY_STATUS:    new Set([429, 502, 503, 504]), // statuses worth retrying
});

const ENDPOINTS = Object.freeze({
  CHAT:     '/chat',
  SEARCH:   '/search',
  MULTI_AI: '/multi-ai',
});

// ─── Custom Error Class ───────────────────────────────────────────────────────

export class APIError extends Error {
  /**
   * @param {string} message
   * @param {number|null} status   - HTTP status code, if available
   * @param {string} endpoint      - Which endpoint was called
   * @param {any} body             - Parsed response body, if any
   */
  constructor(message, status = null, endpoint = '', body = null) {
    super(message);
    this.name     = 'APIError';
    this.status   = status;
    this.endpoint = endpoint;
    this.body     = body;
  }
}

// ─── Core Fetch Wrapper ───────────────────────────────────────────────────────

/**
 * Low-level POST with timeout, retry logic, and structured error handling.
 *
 * @param {string} endpoint       - e.g. '/chat'
 * @param {object} payload        - JSON-serializable request body
 * @param {object} [options]
 * @param {number} [options.timeoutMs]
 * @param {number} [options.retries]
 * @param {AbortSignal} [options.signal]  - External cancellation signal
 * @returns {Promise<object>}     - Parsed JSON response body
 */
async function post(endpoint, payload, options = {}) {
  const {
    timeoutMs  = CONFIG.TIMEOUT_MS,
    retries    = CONFIG.RETRY_ATTEMPTS,
    signal     = null,
  } = options;

  const url = `${CONFIG.BASE_URL}${endpoint}`;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Exponential back-off on retries
    if (attempt > 0) {
      await sleep(CONFIG.RETRY_DELAY_MS * 2 ** (attempt - 1));
    }

    // Merge external signal with per-request timeout
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort('timeout'), timeoutMs);

    if (signal) {
      // If caller aborts, propagate immediately
      signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
    }

    try {
      const response = await fetch(url, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept':        'application/json',
          'X-Client':      'SyntaxSurge/1.0',
        },
        body:   JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse body regardless of status (errors often carry JSON details)
      const contentType = response.headers.get('Content-Type') ?? '';
      const body = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => null);

      if (!response.ok) {
        const message = extractErrorMessage(body) ?? `HTTP ${response.status}: ${response.statusText}`;
        const err = new APIError(message, response.status, endpoint, body);

        // Only retry on transient server errors
        if (CONFIG.RETRY_STATUS.has(response.status) && attempt < retries) {
          lastError = err;
          continue;
        }

        throw err;
      }

      return body;

    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        const reason = controller.signal.reason;
        if (reason === 'timeout') {
          const timeoutErr = new APIError(
            `Request timed out after ${timeoutMs / 1000}s`,
            null,
            endpoint
          );
          if (attempt < retries) { lastError = timeoutErr; continue; }
          throw timeoutErr;
        }
        // Caller deliberately cancelled — don't retry
        throw new APIError('Request cancelled.', null, endpoint);
      }

      if (err instanceof APIError) throw err;

      // Network-level failure (offline, ECONNREFUSED, etc.)
      const netErr = new APIError(
        navigator.onLine
          ? `Cannot reach backend at ${CONFIG.BASE_URL}. Is the server running?`
          : 'No internet connection.',
        null,
        endpoint
      );
      if (attempt < retries) { lastError = netErr; continue; }
      throw netErr;
    }
  }

  // Exhausted retries
  throw lastError ?? new APIError('Request failed after retries.', null, endpoint);
}

// ─── Public API Functions ─────────────────────────────────────────────────────

/**
 * Send a standard chat message.
 *
 * @param {object} params
 * @param {string} params.message               - User's message text
 * @param {Array<{role,content}>} [params.history] - Conversation history
 * @param {AbortSignal} [params.signal]         - Optional cancellation
 * @returns {Promise<{ reply: string }>}
 */
export async function sendMessage({ message, history = [], signal } = {}) {
  assertNonEmpty(message, 'message');

  const payload = {
    mode:    'chat',
    message: message.trim(),
    history: sanitizeHistory(history),
  };

  const data = await post(ENDPOINTS.CHAT, payload, { signal });
  return validateChatResponse(data, ENDPOINTS.CHAT);
}

/**
 * Send a search-augmented query.
 *
 * @param {object} params
 * @param {string} params.query                 - Search query string
 * @param {Array<{role,content}>} [params.history]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{ reply: string, sources?: Array }>}
 */
export async function sendSearchQuery({ query, history = [], signal } = {}) {
  assertNonEmpty(query, 'query');

  const payload = {
    mode:    'search',
    message: query.trim(),
    history: sanitizeHistory(history),
  };

  const data = await post(ENDPOINTS.SEARCH, payload, { signal });
  return validateChatResponse(data, ENDPOINTS.SEARCH);
}

/**
 * Query multiple AI agents simultaneously and return all replies.
 *
 * @param {object} params
 * @param {string} params.message
 * @param {string[]} [params.agents]            - Agent identifiers to query
 * @param {Array<{role,content}>} [params.history]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{ replies: Array<{ agent: string, reply: string }> }>}
 */
export async function sendMultiAI({ message, agents = [], history = [], signal } = {}) {
  assertNonEmpty(message, 'message');

  const payload = {
    mode:    'multi-ai',
    message: message.trim(),
    agents:  agents.length > 0 ? agents : undefined, // let backend use defaults if empty
    history: sanitizeHistory(history),
  };

  const data = await post(ENDPOINTS.MULTI_AI, payload, {
    timeoutMs: CONFIG.MULTI_AI_TIMEOUT,
    signal,
  });

  return validateMultiAIResponse(data, ENDPOINTS.MULTI_AI);
}

// ─── Response Validators ──────────────────────────────────────────────────────

function validateChatResponse(data, endpoint) {
  if (!data || typeof data.reply !== 'string' || data.reply.trim() === '') {
    throw new APIError(
      'Backend returned an invalid or empty reply.',
      null,
      endpoint,
      data
    );
  }
  return data; // { reply, ...optional extras like sources }
}

function validateMultiAIResponse(data, endpoint) {
  if (!data || !Array.isArray(data.replies) || data.replies.length === 0) {
    throw new APIError(
      'Backend returned no multi-AI replies.',
      null,
      endpoint,
      data
    );
  }

  // Normalise each reply entry — ensure both fields are strings
  data.replies = data.replies.map((entry, i) => ({
    agent: typeof entry.agent === 'string' ? entry.agent : `AI ${i + 1}`,
    reply: typeof entry.reply === 'string' ? entry.reply : '',
  }));

  return data; // { replies: [{ agent, reply }, …] }
}

// ─── Health Check ─────────────────────────────────────────────────────────────

/**
 * Ping the backend to verify connectivity.
 * Resolves true if reachable, false otherwise — never throws.
 *
 * @returns {Promise<boolean>}
 */
export async function checkHealth() {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5_000);

    const res = await fetch(`${CONFIG.BASE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(id);
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(m => m && typeof m.role === 'string' && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content }));  // strip internal UI fields
}

function extractErrorMessage(body) {
  if (!body) return null;
  if (typeof body === 'string') return body || null;
  // Common error shapes: { error }, { message }, { detail }, { msg }
  return body.error ?? body.message ?? body.detail ?? body.msg ?? null;
}

function assertNonEmpty(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`[api-client] "${name}" must be a non-empty string.`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
