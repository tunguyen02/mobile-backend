import { Router } from "express";
import chatController from "../controllers/chat.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const ChatRouter = Router();

ChatRouter.post('/send/:userId', authMiddleware.protect, chatController.sendMessage);
ChatRouter.get('/messages/:userId', authMiddleware.protect, chatController.getMessages);
ChatRouter.get('/new-messages/:userId', authMiddleware.protect, chatController.getNewMessages);
ChatRouter.put('/mark-read/:userId', authMiddleware.protect, chatController.markAsRead);
ChatRouter.put('/status/:userId', authMiddleware.protect, chatController.updateStatus);
ChatRouter.get('/unread/:userId', authMiddleware.protect, chatController.getUnreadCount);
ChatRouter.get('/all', authMiddleware.protect, authMiddleware.restrictTo('Admin'), chatController.getAllChats);

export default ChatRouter; 