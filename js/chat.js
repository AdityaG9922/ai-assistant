const sendBtn = document.getElementById("send-btn");
const input = document.getElementById("chat-input");
const messages = document.getElementById("messages");
const searchBtn = document.getElementById("search-btn");
const multiToggle = document.getElementById("multi-toggle");

let searchMode = false;

/* ─────────────────────────────────────────────
   MESSAGE CREATION
───────────────────────────────────────────── */

function createMessage(text, type) {

  const wrapper = document.createElement("div");

  wrapper.className = `message message-${type}`;

  wrapper.innerHTML = `
    <div class="message-bubble">
      ${text}
    </div>
  `;

  messages.appendChild(wrapper);

  setTimeout(() => {
    wrapper.classList.add("visible");
  }, 10);

  messages.scrollTop = messages.scrollHeight;
}

/* ─────────────────────────────────────────────
   THINKING ANIMATION
───────────────────────────────────────────── */

function createThinking() {

  const wrapper = document.createElement("div");

  wrapper.className = "message message-assistant thinking-wrapper";

  wrapper.innerHTML = `
    <div class="message-bubble thinking-bubble">
      <div class="thinking-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;

  messages.appendChild(wrapper);

  setTimeout(() => {
    wrapper.classList.add("visible");
  }, 10);

  messages.scrollTop = messages.scrollHeight;

  return wrapper;
}

/* ─────────────────────────────────────────────
   TEMP AI BRAIN
───────────────────────────────────────────── */

function generateReply(text) {

  const msg = text.toLowerCase();

  if (msg === "2+2") {
    return "4";
  }

  if (msg.includes("hello") || msg.includes("hi")) {
    return "Hello Aditya. Syntax Surge online.";
  }

  if (msg.includes("your name")) {
    return "I am Syntax Surge, your private AI assistant.";
  }

  if (msg.includes("how are you")) {
    return "Systems operating normally.";
  }

  if (msg.includes("what can you do")) {
    return `
      I can help with:
      <ul>
        <li>Study assistance</li>
        <li>General knowledge</li>
        <li>Coding help</li>
        <li>AI research</li>
        <li>Search summarization</li>
      </ul>
    `;
  }

  if (searchMode) {
    return `
      <strong>Search Mode Active</strong><br><br>
      Simulated web research for:<br>
      "${text}"<br><br>
      Future versions will search Google and AI systems live.
    `;
  }

  if (multiToggle.checked) {
    return `
      <strong>Multi-AI Mode</strong><br><br>
      OpenAI response simulated.<br>
      Claude response simulated.<br>
      Gemini response simulated.<br><br>
      Final synthesized answer generated.
    `;
  }

  return `
    I understand your request:<br><br>
    "${text}"<br><br>
    Real AI integration coming next.
  `;
}

/* ─────────────────────────────────────────────
   SEND MESSAGE
───────────────────────────────────────────── */

function sendMessage() {

  const text = input.value.trim();

  if (!text) return;

  createMessage(text, "user");

  input.value = "";

  const thinking = createThinking();

  setTimeout(() => {

    thinking.remove();

    const reply = generateReply(text);

    createMessage(reply, "assistant");

  }, 1200);
}

/* ─────────────────────────────────────────────
   EVENTS
───────────────────────────────────────────── */

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keydown", (e) => {

  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }

});

/* ─────────────────────────────────────────────
   SEARCH MODE
───────────────────────────────────────────── */

searchBtn.addEventListener("click", () => {

  searchMode = !searchMode;

  searchBtn.classList.toggle("active");

  createMessage(
    searchMode
      ? "Search mode enabled."
      : "Search mode disabled.",
    "assistant"
  );

});
