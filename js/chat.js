const sendBtn = document.getElementById("send-btn");
const input = document.getElementById("chat-input");
const messages = document.getElementById("messages");
const searchBtn = document.getElementById("search-btn");
const multiToggle = document.getElementById("multi-toggle");

let searchMode = false;

/* ───────────────────────────── */

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

/* ───────────────────────────── */

function createThinking() {

  const wrapper = document.createElement("div");

  wrapper.className = "message message-assistant";

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

/* ───────────────────────────── */

async function getAIResponse(text) {

  try {

    const endpoint = searchMode
      ? "http://127.0.0.1:47821/search"
      : "http://127.0.0.1:47821/chat";

    const response = await fetch(endpoint, {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        message: text,
        multiAI: multiToggle.checked
      })

    });

    const data = await response.json();

    return data.reply;

  } catch (error) {

    console.error(error);

    return `
      Backend not running.<br><br>

      Start your Node.js server first.<br><br>

      Expected backend:<br>
      http://127.0.0.1:47821
    `;
  }
}

/* ───────────────────────────── */

async function sendMessage() {

  const text = input.value.trim();

  if (!text) return;

  createMessage(text, "user");

  input.value = "";

  const thinking = createThinking();

  const reply = await getAIResponse(text);

  thinking.remove();

  createMessage(reply, "assistant");
}

/* ───────────────────────────── */

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keydown", (e) => {

  if (e.key === "Enter" && !e.shiftKey) {

    e.preventDefault();

    sendMessage();
  }
});

/* ───────────────────────────── */

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
