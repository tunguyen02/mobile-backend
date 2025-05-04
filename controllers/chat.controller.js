import chatService from '../services/chat.service.js';
import User from '../models/user.model.js';
import Chat from '../models/chat.model.js';

const chatController = {
    sendMessage: async (req, res) => {
        try {
            const { userId, chatId, content } = req.body;
            console.log(`Controller: Sending message. UserId: ${userId}, ChatId: ${chatId}, Content: ${content}`);
            console.log(`Current user role: ${req.user.role}, ID: ${req.user._id}`);

            // Xác định người gửi là 'Admin' hay 'User'
            const sender = req.user.role === 'Admin' ? 'Admin' : 'User';
            
            // Đảm bảo có userId hoặc chatId
            if (!userId && !chatId) {
                return res.status(400).json({ message: 'UserId or ChatId is required' });
            }
            
            if (!content) {
                return res.status(400).json({ message: 'Content is required' });
            }
            
            // Gọi service với object chứa tất cả dữ liệu cần thiết
            const chat = await chatService.sendMessage({
                userId,
                chatId,
                content,
                sender
            });
            
            console.log(`Message sent successfully from ${sender}`);
            return res.status(200).json({ 
                message: 'Message sent successfully',
                chat
            });
        } catch (error) {
            console.error('Controller error sending message:', error);
            return res.status(500).json({ message: error.message });
        }
    },

    getMessages: async (req, res) => {
        try {
            const { userId } = req.params;
            console.log(`Chat API: Getting messages for userId ${userId}`);
            
            const chat = await chatService.getMessages(userId);

            res.status(200).json({
                success: true,
                data: chat
            });
        } catch (error) {
            console.error('Error in getMessages API:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    markAsRead: async (req, res) => {
        try {
            const { userId } = req.params;
            const sender = req.user.role === 'Admin' ? 'Admin' : 'User';

            console.log(`Chat API: Marking messages as read for userId ${userId} by ${sender}`);
            
            const chat = await chatService.markAsRead(userId, sender);

            res.status(200).json({
                success: true,
                data: chat
            });
        } catch (error) {
            console.error('Error in markAsRead API:', error);
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

            console.log(`Chat API: Updating status for userId ${userId} to ${status}`);
            
            const chat = await chatService.updateStatus(userId, status);

            res.status(200).json({
                success: true,
                data: chat
            });
        } catch (error) {
            console.error('Error in updateStatus API:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    getUnreadCount: async (req, res) => {
        try {
            const { userId } = req.params;
            const sender = req.user.role === 'Admin' ? 'Admin' : 'User';

            console.log(`Chat API: Getting unread count for userId ${userId} by ${sender}`);
            
            const count = await chatService.getUnreadCount(userId, sender);

            res.status(200).json({
                success: true,
                data: { count }
            });
        } catch (error) {
            console.error('Error in getUnreadCount API:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    // API mới cho người dùng lấy tin nhắn của họ
    getUserMessages: async (req, res) => {
        try {
            const { userId } = req.params;
            const requestingUser = req.user;
            
            console.log(`Getting messages for user ID: ${userId}`);
            console.log(`Requesting user: ${requestingUser._id}, role: ${requestingUser.role}`);

            // Kiểm tra xem user có tồn tại không
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            // Tìm chat giữa user và admin
            let chat;
            if (requestingUser.role === "Admin") {
                // Admin đang yêu cầu xem tin nhắn của một user cụ thể
                chat = await Chat.findOne({
                    userId: userId
                }).populate({
                    path: "messages",
                    options: { sort: { createdAt: 1 } }
                });
            } else {
                // User đang yêu cầu xem tin nhắn của chính họ với admin
                chat = await Chat.findOne({
                    userId: requestingUser._id
                }).populate({
                    path: "messages",
                    options: { sort: { createdAt: 1 } }
                });
            }

            if (!chat) {
                chat = await Chat.create({
                    userId: requestingUser.role === "Admin" ? userId : requestingUser._id,
                    messages: []
                });
            }

            console.log(`Found chat with ${chat.messages.length} messages`);
            
            return res.status(200).json({
                success: true,
                chat
            });
        } catch (error) {
            console.error("Error getting user messages:", error);
            return res.status(500).json({
                success: false,
                message: "Có lỗi xảy ra khi lấy tin nhắn"
            });
        }
    },

    // API mới cho người dùng đánh dấu tin nhắn là đã đọc
    markUserMessagesAsRead: async (req, res) => {
        try {
            const userId = req.user._id;
            const sender = req.user.role === 'Admin' ? 'Admin' : 'User';

            console.log(`Chat API: User ${userId} marking their messages as read`);
            
            const chat = await chatService.markAsRead(userId, sender);

            res.status(200).json({
                success: true,
                chat
            });
        } catch (error) {
            console.error('Error in markUserMessagesAsRead API:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    // API mới cho admin lấy tất cả các cuộc chat
    getAllChats: async (req, res) => {
        try {
            if (req.user.role !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized access'
                });
            }

            console.log(`Chat API: Admin ${req.user._id} getting all chats`);
            
            const chats = await chatService.getAllChats();

            res.status(200).json({
                success: true,
                chats
            });
        } catch (error) {
            console.error('Error in getAllChats API:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },
    
    // API mới để kiểm tra trạng thái người dùng (online/offline)
    checkUserStatus: async (req, res) => {
        try {
            const { userId } = req.params;
            console.log(`Chat API: Checking status for userId ${userId}`);
            
            // Lưu ý: Phần này phụ thuộc vào việc cài đặt theo dõi trạng thái người dùng
            // Bạn có thể lưu trạng thái trong Redis hoặc trong bộ nhớ
            const isOnline = req.app.locals.connectedUsers && req.app.locals.connectedUsers.has(userId);
            
            res.status(200).json({
                success: true,
                data: { userId, isOnline }
            });
        } catch (error) {
            console.error('Error in checkUserStatus API:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    // Lấy tin nhắn của người dùng cụ thể
    getSpecificUserMessages: async (req, res) => {
        try {
            const { userId } = req.params;
            const requestingUser = req.user;
            
            console.log(`Chat API: Getting specific messages for userId ${userId}`);
            console.log(`Requesting user: ${requestingUser._id}, role: ${requestingUser.role}`);
            
            const chat = await chatService.getSpecificUserMessages(userId, requestingUser);
            
            res.status(200).json({
                success: true,
                chat
            });
        } catch (error) {
            console.error('Error in getSpecificUserMessages API:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
};

export default chatController; 