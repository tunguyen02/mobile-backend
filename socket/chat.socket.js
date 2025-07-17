import chatService from '../services/chat.service.js';
import mongoose from 'mongoose';

const socketOptions = {
    pingTimeout: 3000,
    pingInterval: 2000,
};

const chatSocket = (io) => {
    const connectedUsers = new Map();
    const adminSockets = new Set();

    // Gọi trong join và disconnect
    const logConnectedUsers = () => {
        console.log('Current connected users:',
            Array.from(connectedUsers.entries())
                .map(([id, socketId]) => `${id}: ${socketId}`)
                .join(', ')
        );
        console.log('Admin sockets:', Array.from(adminSockets).join(', '));
    };

    // Hàm gửi tin nhắn đến admin 
    const notifyAdmins = (event, data) => {
        if (adminSockets.size === 0) {
            console.log('No admin sockets connected to notify');
            return;
        }

        const notifyPromises = Array.from(adminSockets).map(adminSocketId => {
            return new Promise((resolve) => {
                try {
                    io.to(adminSocketId).emit(event, data);
                    resolve(true);
                } catch (error) {
                    console.error(`Error notifying admin ${adminSocketId}:`, error);
                    resolve(false);
                }
            });
        });


        Promise.all(notifyPromises).then(results => {
            const successCount = results.filter(Boolean).length;
            if (successCount > 0) {
                console.log(`Successfully notified ${successCount}/${adminSockets.size} admins`);
            }
        });
    };

    // Hàm gửi tin nhắn đến user 
    const notifyUser = (userId, event, data) => {
        const userSocketId = connectedUsers.get(userId);
        if (!userSocketId) {
            console.log(`User ${userId} is not connected, cannot send ${event}`);
            return false;
        }

        try {
            // Gửi ngay lập tức 
            io.to(userSocketId).emit(event, data);

            // Gửi thêm một lần nữa qua phòng riêng để đảm bảo tin nhắn được nhận
            io.to(`user:${userId}`).emit(event, data);

            return true;
        } catch (error) {
            console.error(`Error sending ${event} to user ${userId}:`, error);
            return false;
        }
    };

    // Tiền xử lý dữ liệu tin nhắn trước khi gửi để giảm kích thước dữ liệu
    const processMessageForTransport = (chat) => {
        if (chat.messages && chat.messages.length > 20) {
            const recentMessages = chat.messages.slice(-20);
            return { ...chat, messages: recentMessages, isTruncated: true };
        }
        return chat;
    };

    io.on('connection', (socket) => {

        // User joins 
        socket.on('join', (userData) => {
            console.log('User joined:', userData);
            const { userId, role } = userData;

            if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                console.error('Invalid userId in join event:', userId);
                socket.emit('error', 'Invalid userId');
                return;
            }

            connectedUsers.set(userId, socket.id);

            // Thêm phòng riêng cho user 
            socket.join(`user:${userId}`);

            if (role === 'Admin') {
                adminSockets.add(socket.id);
                // Thêm phòng riêng cho admin
                socket.join('admins');

                // Gửi danh sách tất cả user đang online về admin
                socket.emit('onlineUsers', Array.from(connectedUsers.keys()));
            } else {
                // Thông báo cho admin có user mới online
                io.to('admins').emit('userOnline', userId);
            }

            logConnectedUsers();
        });

        // Client gửi tin nhắn 
        socket.on('sendMessage', async (data) => {
            const startTime = Date.now();
            try {
                const { userId, sender, content, type } = data;

                if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                    console.error('Invalid userId in sendMessage event:', userId);
                    socket.emit('error', 'Invalid userId');
                    return;
                }

                const tempMessage = {
                    sender,
                    content,
                    type: type || 'Text',
                    isRead: false,
                    createdAt: new Date(),
                    _id: `temp-${Date.now()}`,
                    isTempId: true
                };

                const processingPromise = chatService.sendMessage(userId, sender, content, type);

                // Gửi tin nhắn tạm thời ngay lập tức không đợi lưu DB
                if (sender === 'Admin') {
                    notifyUser(userId, 'newMessage', {
                        userId,
                        messages: [tempMessage]
                    });

                    setTimeout(() => {
                        notifyUser(userId, 'newMessage', {
                            userId,
                            messages: [tempMessage]
                        });
                    }, 50);
                } else {
                    // User gửi tin nhắn đến Admin
                    io.to('admins').emit('newUserMessage', {
                        userId,
                        message: tempMessage
                    });
                }

                const chat = await processingPromise;
                const latestMessage = chat.messages[chat.messages.length - 1];

                // Gửi lại tin nhắn chính thức
                if (sender === 'Admin') {
                    notifyUser(userId, 'newMessage', processMessageForTransport(chat));

                    setTimeout(() => {
                        notifyUser(userId, 'newMessage', processMessageForTransport(chat));
                    }, 100);
                } else {
                    io.to('admins').emit('newUserMessage', {
                        userId,
                        message: latestMessage
                    });
                }

                // Xác nhận lại với người gửi
                socket.emit('messageSent', processMessageForTransport(chat));

                const endTime = Date.now();
                console.log(`Message processing time: ${endTime - startTime}ms`);
            } catch (error) {
                console.error('Error in sendMessage:', error);
                socket.emit('error', error.message);
            }
        });

        // Mark as read 
        socket.on('markAsRead', async (data) => {
            try {
                const { userId, sender } = data;

                if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                    console.error('Invalid userId in markAsRead event:', userId);
                    socket.emit('error', 'Invalid userId');
                    return;
                }

                const markAsReadPromise = chatService.markAsRead(userId, sender);

                if (sender === 'Admin') {
                    notifyUser(userId, 'messagesRead', { isProcessing: true, userId });
                } else {
                    io.to('admins').emit('messagesRead', { isProcessing: true, userId });
                }

                const chat = await markAsReadPromise;

                if (sender === 'Admin') {
                    notifyUser(userId, 'messagesRead', chat);
                } else {
                    io.to('admins').emit('messagesRead', { userId, chat });
                }

                socket.emit('messagesRead', chat);
            } catch (error) {
                console.error('Error in markAsRead:', error);
                socket.emit('error', error.message);
            }
        });

        // User typing 
        socket.on('typing', (data) => {
            const { userId, isTyping, sender } = data;

            if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                return;
            }

            if (sender === 'Admin') {
                notifyUser(userId, 'typing', { isTyping });
            } else {
                io.to('admins').emit('typing', { userId, isTyping });
            }
        });

        // Ping để giữ kết nối 
        socket.on('ping', (data) => {
            const { userId } = data;
            if (userId && mongoose.Types.ObjectId.isValid(userId)) {
                connectedUsers.set(userId, socket.id);
                socket.emit('pong');
            }
        });

        // Disconnect 
        socket.on('disconnect', () => {

            const wasAdmin = adminSockets.delete(socket.id);

            if (!wasAdmin) {
                for (const [userId, socketId] of connectedUsers.entries()) {
                    if (socketId === socket.id) {
                        console.log('User disconnected:', userId);
                        connectedUsers.delete(userId);

                        io.to('admins').emit('userOffline', userId);
                        break;
                    }
                }
            }

            socket.leaveAll();
            logConnectedUsers();
        });
    });
};

export default chatSocket; 