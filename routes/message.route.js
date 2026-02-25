import express from "express";
import {
  getConversation,
  sendMessage,
  streamMessages,
} from "../controllers/message.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/stream", protect, streamMessages);
router.get("/:userId", protect, getConversation);
router.post("/:userId", protect, sendMessage);

export default router;
