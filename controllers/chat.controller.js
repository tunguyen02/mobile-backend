import chatService from '../services/chat.service.js';
import mongoose from 'mongoose';

const chatController = {
    sendMessage: async (req, res) => {
        try {
            const { content, type } = req.body;
            const { userId } = req.params;

            if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid userId'
                });
            }

            const sender = req.user.role === 'Admin' ? 'Admin' : 'User';

            const chat = await chatService.sendMessage(userId, sender, content, type);

            res.status(200).json({
                success: true,
                data: chat
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    getMessages: async (req, res) => {
        try {
            const { userId } = req.params;

            if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid userId'
                });
            }

            const chat = await chatService.getMessages(userId);

            res.status(200).json({
                success: true,
                data: chat
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    markAsRead: async (req, res) => {
        try {
            const { userId } = req.params;

            if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid userId'
                });
            }

            const sender = req.user.role === 'Admin' ? 'Admin' : 'User';

            const chat = await chatService.markAsRead(userId, sender);

            res.status(200).json({
                success: true,
                data: chat
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    updateStatus: async (req, res) => {
        try {
            const { userId } = req.params;
            const { status } = req.body;

            if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid userId'
                });
            }

            const chat = await chatService.updateStatus(userId, status);

            res.status(200).json({
                success: true,
                data: chat
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    getUnreadCount: async (req, res) => {
        try {
            const { userId } = req.params;

            if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid userId'
                });
            }

            const sender = req.user.role === 'Admin' ? 'Admin' : 'User';

            const count = await chatService.getUnreadCount(userId, sender);

            res.status(200).json({
                success: true,
                data: { count }
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    getAllChats: async (req, res) => {
        try {
            const chats = await chatService.getAllChats();

            res.status(200).json({
                success: true,
                data: chats
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
};

export default chatController; 