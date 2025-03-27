import Chat from "../models/chat.model.js";

const chatService = {
    createChat: async (userId) => {
        try {
            const existingChat = await Chat.findOne({ userId });
            if (existingChat) {
                throw new Error('Chat already exists for this user');
            }

            const newChat = await Chat.create({
                userId,
                messages: [],
                status: 'Open'
            });

            return newChat;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    sendMessage: async (userId, sender, content, type = 'Text') => {
        try {
            let chat = await Chat.findOne({ userId });
            if (!chat) {
                chat = await Chat.create({
                    userId,
                    messages: [],
                    status: 'Open'
                });
            }

            chat.messages.push({
                sender,
                content,
                type,
                isRead: false
            });

            chat.lastMessage = Date.now();
            await chat.save();

            return chat;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    getMessages: async (userId) => {
        try {
            const chat = await Chat.findOne({ userId })
                .populate('userId', 'name email');
            return chat;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    markAsRead: async (userId, sender) => {
        try {
            const chat = await Chat.findOne({ userId });
            if (!chat) {
                throw new Error('Chat not found');
            }

            chat.messages = chat.messages.map(msg => {
                if (msg.sender !== sender && !msg.isRead) {
                    msg.isRead = true;
                }
                return msg;
            });

            await chat.save();
            return chat;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    updateStatus: async (userId, status) => {
        try {
            const chat = await Chat.findOneAndUpdate(
                { userId },
                { status },
                { new: true }
            );
            return chat;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    getUnreadCount: async (userId, sender) => {
        try {
            const chat = await Chat.findOne({ userId });
            if (!chat) return 0;

            return chat.messages.filter(msg =>
                msg.sender !== sender && !msg.isRead
            ).length;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

export default chatService; 