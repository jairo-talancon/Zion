const express = require("express");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize:2e7
});

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/zion";

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

mongoose
  .connect(MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true }
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

app.post("/register", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({ ok: false, message: "Missing username or password." });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ ok: false, message: "Username already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ username, passwordHash });

    return res.json({ ok: true, message: "Registered." });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ ok: false, message: "Register failed." });
  }
});

app.post("/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({ ok: false, message: "Missing username or password." });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ ok: false, message: "Invalid login." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ ok: false, message: "Invalid login." });
    }

    return res.json({ ok: true, username });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ ok: false, message: "Login failed." });
  }
});

const connectedUsers = new Map();
const usernameToSocketId = new Map();

function getOnlineUsernames() {
  return [...connectedUsers.values()];
}

io.on("connection", (socket) => {
  socket.on("join", (username) => {
    const clean = String(username || "").trim();
    if (!clean) return;

    connectedUsers.set(socket.id, clean);
    usernameToSocketId.set(clean, socket.id);

    io.emit("system_message", `User connected... ${clean} has entered the system.`);
  });

  socket.on("chat_message", ({ username, text }) => {
    io.emit("chat_message", { username, text });
  });

  socket.on("typing_start", ({ username }) => {
    socket.broadcast.emit("typing_start", { username });
  });

  socket.on("typing_stop", ({ username }) => {
    socket.broadcast.emit("typing_stop", { username });
  });

  socket.on("request_online", () => {
    socket.emit("online_list", getOnlineUsernames());
  });

  socket.on("request_agents", () => {
    const online = getOnlineUsernames();
    const agents = online.filter((u) => u.toLowerCase() === "admin");

    if (agents.length === 0) {
      socket.emit("system_message", "No agents detected.");
    } else if (agents.length === 1) {
      socket.emit("system_message", "1 agent detected.");
    } else {
      socket.emit("system_message", "Multiple agents detected...");
      io.emit("glitch");
    }
  });

  socket.on("whisper", ({ from, to, text }) => {
    const targetId = usernameToSocketId.get(String(to || "").trim());
    if (!targetId) {
      socket.emit("system_message", `User not found: ${to}`);
      return;
    }

    io.to(targetId).emit("whisper_message", { from, text });
    socket.emit("whisper_sent", { to, text });
  });

  socket.on("upload_media", ({ username, name, mimeType, dataUrl }) => {
    io.emit("media_message", { username, name, mimeType, dataUrl });
  });

  socket.on("disconnect", () => {
    const username = connectedUsers.get(socket.id);
    if (username) {
      connectedUsers.delete(socket.id);
      usernameToSocketId.delete(username);
      io.emit("system_message", `${username} disconnected.`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Zion running on port ${PORT}`);
});
