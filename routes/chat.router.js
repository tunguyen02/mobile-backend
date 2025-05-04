import { Router } from "express";
import chatController from "../controllers/chat.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const ChatRouter = Router();

// APIs cho cả người dùng và admin
ChatRouter.post('/send', authMiddleware.protect, chatController.sendMessage);
ChatRouter.get('/messages/user/:userId', authMiddleware.protect, chatController.getSpecificUserMessages);
ChatRouter.get('/messages/:userId', authMiddleware.protect, chatController.getMessages);
ChatRouter.put('/mark-read/:userId', authMiddleware.protect, chatController.markAsRead);
ChatRouter.put('/status/:userId', authMiddleware.protect, chatController.updateStatus);
ChatRouter.get('/unread/:userId', authMiddleware.protect, chatController.getUnreadCount);
ChatRouter.get('/user-status/:userId', authMiddleware.protect, chatController.checkUserStatus);

// APIs cho người dùng - lấy tin nhắn của bản thân
ChatRouter.get('/messages', authMiddleware.protect, chatController.getUserMessages);
ChatRouter.put('/mark-read', authMiddleware.protect, chatController.markUserMessagesAsRead);

// APIs cho admin - quản lý tất cả chat
ChatRouter.get('/all', authMiddleware.protect, chatController.getAllChats);

export default ChatRouter; 