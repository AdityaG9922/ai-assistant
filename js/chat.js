const sendBtn = document.getElementById("send-btn");
const input = document.getElementById("chat-input");
const messages = document.getElementById("messages");

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

function generateReply(text) {
  if (text.toLowerCase() === "2+2") {
    return "4";
  }

  return "Syntax Surge received: " + text;
}

function sendMessage() {
  const text = input.value.trim();

  if (!text) return;

  createMessage(text, "user");

  input.value = "";

  setTimeout(() => {
    createMessage(generateReply(text), "assistant");
  }, 500);
}

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
