const socket = io();

let currentUsername = "";
let lastSentMessage = "";
let typingTimeout = null;

const riddleScreen = document.getElementById("riddleScreen");
const pillScreen = document.getElementById("pillScreen");
const authScreen = document.getElementById("authScreen");
const chatScreen = document.getElementById("chatScreen");

const riddleInput = document.getElementById("riddleInput");
const riddleFeedback = document.getElementById("riddleFeedback");

const rabbitFlash = document.getElementById("rabbitFlash");
const redPill = document.getElementById("redPill");
const bluePill = document.getElementById("bluePill");
const pillHint = document.getElementById("pillHint");

const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");
const authStatus = document.getElementById("authStatus");

const terminalLog = document.getElementById("terminalLog");
const typingIndicator = document.getElementById("typingIndicator");
const chatInput = document.getElementById("chatInput");
// iPhone keyboard fix
function adjustForKeyboard() {
  const vh = window.innerHeight;
  document.querySelector(".terminal-shell").style.height = vh + "px";
}

window.addEventListener("resize", adjustForKeyboard);
window.addEventListener("focusin", adjustForKeyboard);
window.addEventListener("focusout", adjustForKeyboard);

// keep input visible
chatInput.addEventListener("focus", () => {
  setTimeout(() => {
    chatInput.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 300);
});


const mobileUploadBtn = document.getElementById("mobileUploadBtn");

mobileUploadBtn.addEventListener("click", (e) => {
  e.preventDefault();
  fileInput.click();
});

const fileInput = document.getElementById("fileInput");

const canvas = document.getElementById("matrixCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const matrixChars = "01ア2イ3ウ4エ5オ6カ7キ8ク9ケコサシスセソ";
const fontSize = 16;
let drops = [];

function resetDrops() {
  const columns = Math.floor(canvas.width / fontSize);
  drops = new Array(columns).fill(1);
}
resetDrops();
window.addEventListener("resize", resetDrops);

let matrixInterval = setInterval(drawMatrix, 45);

function drawMatrix() {
  ctx.fillStyle = "rgba(0,0,0,0.07)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#00ff66";
  ctx.font = `${fontSize}px monospace`;

  for (let i = 0; i < drops.length; i += 1) {
    const text = matrixChars[Math.floor(Math.random() * matrixChars.length)];
    ctx.fillText(text, i * fontSize, drops[i] * fontSize);

    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
      drops[i] = 0;
    }
    drops[i] += 1;
  }
}

function stopMatrix() {
  clearInterval(matrixInterval);
  canvas.style.display = "none";
}

document.addEventListener("keydown", () => {
  if (!riddleScreen.classList.contains("hidden")) {
    riddleInput.focus();
  }
});

riddleInput.addEventListener("input", () => {
  const value = riddleInput.value.trim().toLowerCase();

  if (value === "white rabbit") {
    riddleFeedback.textContent = "ACCESS GRANTED...";
    stopMatrix();
    riddleScreen.classList.add("hidden");

    pillScreen.classList.remove("hidden");
    rabbitFlash.classList.remove("hidden");

    setTimeout(() => {
      rabbitFlash.classList.add("hidden");
    }, 1200);
  } else {
    riddleFeedback.textContent = "";
  }
});

redPill.addEventListener("mouseenter", () => {
  pillHint.textContent = "Reality bends.";
});
redPill.addEventListener("mouseleave", () => {
  pillHint.textContent = "";
});
bluePill.addEventListener("mouseenter", () => {
  pillHint.textContent = "Ignorance is bliss.";
});
bluePill.addEventListener("mouseleave", () => {
  pillHint.textContent = "";
});

redPill.addEventListener("click", () => {
  pillScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
  usernameInput.focus();
});

bluePill.addEventListener("click", () => {
  pillHint.textContent = "You stay in the illusion...";
});

registerBtn.addEventListener("click", async () => {
  authStatus.textContent = "Registering...";
  try {
    const response = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: usernameInput.value.trim(),
        password: passwordInput.value
      })
    });

    const data = await response.json().catch(() => null);
    if (data?.ok) {
      authStatus.textContent = "Registered. Now log in.";
    } else {
      authStatus.textContent = data?.message || "Register failed.";
    }
  } catch {
    authStatus.textContent = "Register failed.";
  }
});

loginBtn.addEventListener("click", async () => {
  authStatus.textContent = "Logging in...";
  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: usernameInput.value.trim(),
        password: passwordInput.value
      })
    });

    const data = await response.json().catch(() => null);
    if (data?.ok) {
      currentUsername = data.username;
      authScreen.classList.add("hidden");
      chatScreen.classList.remove("hidden");
      chatInput.focus();

      addSystemLine("USER AUTHENTICATED");
      addSystemLine("ENTERING SYSTEM...");
      addSystemLine("Wake up. You are now inside the system.");

      socket.emit("join", currentUsername);
    } else {
      authStatus.textContent = data?.message || "Login failed.";
    }
  } catch {
    authStatus.textContent = "Login failed.";
  }
});

function addLine(text, className = "terminal-user") {
  const line = document.createElement("div");
  line.className = `terminal-line ${className}`;
  line.textContent = text;
  terminalLog.appendChild(line);
  terminalLog.scrollTop = terminalLog.scrollHeight;
}

function addHtml(html) {
  const line = document.createElement("div");
  line.className = "terminal-line media-block";
  line.innerHTML = html;
  terminalLog.appendChild(line);
  terminalLog.scrollTop = terminalLog.scrollHeight;
}

function addSystemLine(text) {
  addLine(text, "terminal-system");
}

function runGlitch() {
  document.body.classList.add("glitch");
  setTimeout(() => document.body.classList.remove("glitch"), 220);
}

function sendChat() {
  const raw = chatInput.value.trim();
  if (!raw) return;

  if (raw.startsWith("/")) {
    handleCommand(raw);
    chatInput.value = "";
    return;
  }

  if (raw.toLowerCase() === "spoon") {
    addSystemLine("There is no spoon.");
    runGlitch();
    chatInput.value = "";
    return;
  }

  if (raw === lastSentMessage) {
    addSystemLine("Déjà vu.");
    runGlitch();
  }

  lastSentMessage = raw;
  socket.emit("chat_message", { username: currentUsername, text: raw });
  chatInput.value = "";
}

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendChat();
  }
});

chatInput.addEventListener("input", () => {
  if (!currentUsername) return;
  socket.emit("typing_start", { username: currentUsername });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("typing_stop", { username: currentUsername });
  }, 700);
});

function handleCommand(command) {
  const [base, ...rest] = command.split(" ");

  switch (base.toLowerCase()) {
    case "/help":
      addSystemLine("The answer is out there...");
      addSystemLine("/upload");
      addSystemLine("/clear");
      addSystemLine("/online");
      addSystemLine("/agents");
      addSystemLine("/whisper username message");
      addSystemLine("/exit");
      break;

    case "/clear":
      terminalLog.innerHTML = "";
      addSystemLine("System cleared.");
      break;

    case "/online":
      socket.emit("request_online");
      break;

    case "/agents":
      socket.emit("request_agents");
      break;

    case "/upload":
      fileInput.click();
      break;

    case "/exit":
      addSystemLine("You were never here.");
      setTimeout(() => addSystemLine("Disconnecting..."), 400);
      setTimeout(() => {
        addSystemLine("Connection lost.");
        location.reload();
      }, 900);
      break;

    case "/whisper": {
      const to = rest[0];
      const text = rest.slice(1).join(" ").trim();
      if (!to || !text) {
        addSystemLine("Usage: /whisper username message");
        return;
      }
      socket.emit("whisper", { from: currentUsername, to, text });
      break;
    }

    default:
      addSystemLine("Unknown command.");
  }
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();

  addSystemLine("Uploading...");
  
  reader.onload = function () {
    socket.emit("upload_media", {
      username: currentUsername,
      name: file.name,
      mimeType: file.type,
      dataUrl: reader.result
    });

    addSystemLine("File injected into system.");
  };

  reader.onerror = function () {
    addSystemLine("Upload failed.");
  };

  reader.readAsDataURL(file);
});

socket.on("chat_message", ({ username, text }) => {
  addLine(`${username}: ${text}`);
});

socket.on("system_message", (text) => {
  addSystemLine(text);
});

socket.on("typing_start", ({ username }) => {
  typingIndicator.textContent = `${username} is typing...`;
});

socket.on("typing_stop", () => {
  typingIndicator.textContent = "";
});

socket.on("online_list", (users) => {
  addSystemLine("Users connected:");
  users.forEach((u) => addSystemLine(`- ${u}`));
});

socket.on("whisper_message", ({ from, text }) => {
  addSystemLine(`(whisper) ${from}: ${text}`);
});

socket.on("whisper_sent", ({ to, text }) => {
  addSystemLine(`(you → ${to}): ${text}`);
});

socket.on("media_message", ({ username, mimeType, dataUrl, name }) => {
  addSystemLine(`${username}:`);

  if (mimeType.startsWith("image/")) {
    addHtml(`<img src="${dataUrl}" alt="${name}">`);
  } else if (mimeType.startsWith("video/")) {
    addHtml(`<video src="${dataUrl}" controls></video>`);
  } else {
    addSystemLine(`[FILE] ${name}`);
  }
});

socket.on("glitch", () => {
  runGlitch();
});