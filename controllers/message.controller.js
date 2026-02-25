import Message from "../model/message.model.js";
import User from "../model/user.model.js";

const streamsByUserId = new Map();

const serializeMessage = (message) => ({
  id: message._id,
  senderId: message.senderId?._id || message.senderId,
  receiverId: message.receiverId?._id || message.receiverId,
  text: message.text,
  createdAt: message.createdAt,
});

const sendSSEEvent = (res, event, data) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

const notifyUser = (userId, payload) => {
  const streamSet = streamsByUserId.get(userId.toString());
  if (!streamSet) return;

  for (const streamRes of streamSet) {
    sendSSEEvent(streamRes, "message", payload);
  }
};

export const getUsers = async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } })
    .select("_id name email profilePic")
    .sort({ name: 1 });

  return res.status(200).json({
    users: users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic,
    })),
  });
};

export const getConversation = async (req, res) => {
  const { userId } = req.params;

  const messages = await Message.find({
    $or: [
      { senderId: req.user._id, receiverId: userId },
      { senderId: userId, receiverId: req.user._id },
    ],
  }).sort({ createdAt: 1 });

  return res.status(200).json({
    messages: messages.map(serializeMessage),
  });
};

export const sendMessage = async (req, res) => {
  const { userId: receiverId } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: "Message text is required." });
  }

  const receiver = await User.findById(receiverId).select("_id");
  if (!receiver) {
    return res.status(404).json({ message: "Receiver not found." });
  }

  const createdMessage = await Message.create({
    senderId: req.user._id,
    receiverId,
    text: text.trim(),
  });

  const payload = serializeMessage(createdMessage);
  notifyUser(req.user._id, payload);
  notifyUser(receiverId, payload);

  return res.status(201).json({ message: payload });
};

export const streamMessages = async (req, res) => {
  const userId = req.user._id.toString();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  if (!streamsByUserId.has(userId)) {
    streamsByUserId.set(userId, new Set());
  }
  streamsByUserId.get(userId).add(res);

  sendSSEEvent(res, "connected", { userId });

  const keepAlive = setInterval(() => {
    res.write(":keepalive\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    const streamSet = streamsByUserId.get(userId);
    if (!streamSet) return;

    streamSet.delete(res);
    if (!streamSet.size) {
      streamsByUserId.delete(userId);
    }
  });
};
