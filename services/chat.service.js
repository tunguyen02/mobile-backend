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

    sendMessage: async (data) => {
        try {
            const { chatId, userId, content, sender } = data;
            console.log(`Service: Sending message. ChatId: ${chatId}, UserId: ${userId}, Sender: ${sender}`);
            
            let chat;
            
            // Nếu có chatId, cập nhật chat hiện có
            if (chatId) {
                console.log(`Adding message to existing chat ${chatId}`);
                chat = await Chat.findById(chatId);
                
                if (!chat) {
                    throw new Error('Chat not found');
                }
                
                // Thêm tin nhắn mới
                chat.messages.push({
                    content,
                    sender,
                    read: false,
                    createdAt: new Date()
                });
                
                // Cập nhật thời gian tin nhắn cuối cùng
                chat.lastMessage = Date.now();
                await chat.save();
            } 
            // Nếu không có chatId, kiểm tra xem có chat hiện có cho userId không
            else if (userId) {
                console.log(`Finding or creating chat for user ${userId}`);
                
                // Tìm hoặc tạo chat mới
                chat = await Chat.findOne({ userId });
                
                if (!chat) {
                    console.log(`Creating new chat for user ${userId}`);
                    chat = await Chat.create({
                        userId,
                        messages: [{
                            content,
                            sender,
                            read: false,
                            createdAt: new Date()
                        }],
                        status: 'Open',
                        lastMessage: Date.now()
                    });
                } else {
                    console.log(`Adding message to existing chat for user ${userId}`);
                    chat.messages.push({
                        content,
                        sender,
                        read: false,
                        createdAt: new Date()
                    });
                    chat.lastMessage = Date.now();
                    await chat.save();
                }
            } else {
                throw new Error('ChatId or userId is required');
            }
            
            // Log thông tin tin nhắn để debug
            const latestMessage = chat.messages[chat.messages.length - 1];
            console.log(`Message saved: Content="${latestMessage.content}", Sender=${latestMessage.sender}, Time=${new Date(latestMessage.createdAt).toISOString()}`);
            
            // Trả về chat đã cập nhật
            return await Chat.findById(chat._id)
                .populate({
                    path: 'userId',
                    select: 'name email _id role'
                })
                .populate({
                    path: "messages",
                    options: { sort: { createdAt: 1 } }
                });
        } catch (error) {
            console.error('Error sending message:', error);
            throw new Error(error.message);
        }
    },

    getMessages: async (userId) => {
        try {
            let chat = await Chat.findOne({ userId })
                .populate({
                    path: 'userId',
                    select: 'name email _id'
                })
                .populate({
                    path: "messages",
                    options: { sort: { createdAt: 1 } }
                });
            
            if (!chat) {
                console.log(`Creating new chat for userId ${userId} as none exists`);
                chat = await Chat.create({
                    userId,
                    messages: [],
                    status: 'Open',
                    lastMessage: Date.now()
                });
                
                // Populate sau khi tạo mới
                chat = await Chat.findById(chat._id)
                    .populate({
                        path: 'userId',
                        select: 'name email _id'
                    })
                    .populate({
                        path: "messages",
                        options: { sort: { createdAt: 1 } }
                    });
            }
            
            return chat;
        } catch (error) {
            console.error(`Error getting messages for userId ${userId}:`, error);
            throw new Error(error.message);
        }
    },

    markAsRead: async (userId, sender) => {
        try {
            let chat = await Chat.findOne({ userId });
            
            if (!chat) {
                console.log(`Creating new chat for userId ${userId} as none exists`);
                chat = await Chat.create({
                    userId,
                    messages: [],
                    status: 'Open',
                    lastMessage: Date.now()
                });
                return chat;
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
    },

    // Lấy tất cả chat cho admin
    getAllChats: async () => {
        try {
            console.log('Getting all chats for admin');
            // Đảm bảo populate userId đầy đủ và đúng thông tin
            const chats = await Chat.find()
                .populate({
                    path: 'userId',
                    select: 'name email _id role'
                })
                .populate({
                    path: "messages",
                    options: { sort: { createdAt: -1 } }
                })
                .sort({ lastMessage: -1 });
            
            console.log(`Found ${chats.length} chats`);
            
            // Kiểm tra kỹ thông tin userId trong mỗi chat
            chats.forEach((chat, index) => {
                console.log(`Chat ${index}: User=${chat.userId?.name || 'Unknown'}, ID=${chat.userId?._id}, Role=${chat.userId?.role || 'Unknown'}, Messages=${chat.messages?.length || 0}`);
                if (!chat.userId || !chat.userId.name) {
                    console.warn(`Chat ${index}: Missing or incomplete user information!`);
                }
            });
            
            return chats;
        } catch (error) {
            console.error('Error getting all chats:', error);
            throw new Error(error.message);
        }
    },
    
    // Lấy tin nhắn của user cụ thể
    getSpecificUserMessages: async (userId, requestingUser) => {
        try {
            console.log(`Service: Getting specific messages for userId ${userId}`);
            console.log(`Requesting user: ${requestingUser._id}, role: ${requestingUser.role}`);
            
            // Xác định ID người dùng cho cuộc trò chuyện (không phải admin)
            // Nếu người yêu cầu là admin, sử dụng userId được chỉ định
            // Nếu người yêu cầu là user, sử dụng ID của user
            const userIdForChat = requestingUser.role === 'Admin' 
                ? (userId ? userId.toString() : null)
                : (requestingUser._id ? requestingUser._id.toString() : null);
            
            if (!userIdForChat) {
                console.error('Invalid userId for query:', userIdForChat);
                throw new Error('Invalid user ID');
            }
            
            console.log(`Looking for chat with userId: ${userIdForChat}`);
            
            // Tìm chat dựa trên userId (lưu ý: chat luôn được lưu với userId là người dùng thường, không phải admin)
            let chat = await Chat.findOne({ userId: userIdForChat })
                .populate({
                    path: 'userId',
                    select: 'name email _id role'
                })
                .populate({
                    path: "messages",
                    options: { sort: { createdAt: 1 } }
                });
            
            // Nếu không tìm thấy chat, tạo mới
            if (!chat) {
                console.log(`Creating new chat for userId ${userIdForChat} as none exists`);
                chat = await Chat.create({
                    userId: userIdForChat,
                    messages: [],
                    status: 'Open',
                    lastMessage: Date.now()
                });
                
                // Populate sau khi tạo mới
                chat = await Chat.findById(chat._id)
                    .populate({
                        path: 'userId',
                        select: 'name email _id role'
                    });
            }
            
            // Log để debug
            console.log(`Found/created chat for user ${userIdForChat} with ${chat?.messages?.length || 0} messages`);
            console.log(`Chat user details: ID=${chat.userId?._id}, Name=${chat.userId?.name}, Role=${chat.userId?.role}`);
            
            // Log một số tin nhắn gần đây để debug
            if (chat.messages && chat.messages.length > 0) {
                console.log("Recent messages:");
                const recentMessages = chat.messages.slice(Math.max(0, chat.messages.length - 3));
                recentMessages.forEach((msg, idx) => {
                    console.log(`  - Message ${idx+1}: From=${msg.sender}, Content="${msg.content}", Time=${new Date(msg.createdAt).toISOString()}`);
                });
            }
            
            return chat;
        } catch (error) {
            console.error(`Service error getting messages for user ${userId}:`, error);
            throw new Error(error.message);
        }
    }
};

export default chatService; 