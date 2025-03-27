import { Router } from "express";
import chatController from "../controllers/chat.controller.js";

const ChatRouter = Router();

ChatRouter.post('/send/:userId', chatController.sendMessage);
ChatRouter.get('/messages/:userId', chatController.getMessages);
ChatRouter.put('/mark-read/:userId', chatController.markAsRead);
ChatRouter.put('/status/:userId', chatController.updateStatus);
ChatRouter.get('/unread/:userId', chatController.getUnreadCount);

export default ChatRouter; 