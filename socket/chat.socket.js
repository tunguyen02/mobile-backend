import chatService from '../services/chat.service.js';
import mongoose from 'mongoose';

const chatSocket = (io) => {
    const connectedUsers = new Map();
    const adminSockets = new Set();

    io.on('connection', (socket) => {
        console.log('Socket connected:', socket.id);

        // User joins
        socket.on('join', (userData) => {
            console.log('User joined:', userData);
            const { userId, role } = userData;

            // Kiểm tra userId hợp lệ
            if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                console.error('Invalid userId in join event:', userId);
                socket.emit('error', 'Invalid userId');
                return;
            }

            connectedUsers.set(userId, socket.id);

            // Lưu socketId của admin vào adminSockets
            if (role === 'Admin') {
                adminSockets.add(socket.id);

                // Gửi danh sách tất cả user đang online về admin
                socket.emit('onlineUsers', Array.from(connectedUsers.keys()));
                console.log('Admin joined, connected users:', Array.from(connectedUsers.keys()));
            }

            // Gửi thông báo tới các admin
            adminSockets.forEach(adminSocketId => {
                io.to(adminSocketId).emit('userOnline', userId);
            });
        });

        // client gửi tin nhắn
        socket.on('sendMessage', async (data) => {
            console.log('Message received:', data);
            try {
                const { userId, sender, content, type } = data;

                // Kiểm tra userId hợp lệ
                if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                    console.error('Invalid userId in sendMessage event:', userId);
                    socket.emit('error', 'Invalid userId');
                    return;
                }

                const chat = await chatService.sendMessage(userId, sender, content, type);

                // Gửi tin nhắn đến người nhận nếu online
                const receiverSocketId = connectedUsers.get(userId);
                if (receiverSocketId) {
                    console.log('Sending to receiver:', receiverSocketId);
                    io.to(receiverSocketId).emit('newMessage', chat);
                }

                // Nếu sender là User thi thông báo cho Admin
                if (sender === 'User') {
                    adminSockets.forEach(adminSocketId => {
                        console.log('Notifying admin:', adminSocketId);
                        io.to(adminSocketId).emit('newUserMessage', {
                            userId,
                            message: chat.messages[chat.messages.length - 1]
                        });
                    });
                }

                // Xác nhận lại với người gửi
                socket.emit('messageSent', chat);
            } catch (error) {
                console.error('Error in sendMessage:', error);
                socket.emit('error', error.message);
            }
        });

        // Mark as read
        socket.on('markAsRead', async (data) => {
            console.log('Mark as read:', data);
            try {
                const { userId, sender } = data;

                if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                    console.error('Invalid userId in markAsRead event:', userId);
                    socket.emit('error', 'Invalid userId');
                    return;
                }

                const chat = await chatService.markAsRead(userId, sender);

                // Gửi thông báo đã đọc cho phía còn lại
                if (sender === 'Admin') {
                    const userSocketId = connectedUsers.get(userId);
                    if (userSocketId) {
                        io.to(userSocketId).emit('messagesRead', chat);
                    }
                } else {
                    // Notify admins
                    adminSockets.forEach(adminSocketId => {
                        io.to(adminSocketId).emit('messagesRead', { userId, chat });
                    });
                }

                socket.emit('messagesRead', chat);
            } catch (error) {
                console.error('Error in markAsRead:', error);
                socket.emit('error', error.message);
            }
        });

        // User typing
        socket.on('typing', (data) => {
            console.log('User typing:', data);
            const { userId, isTyping, sender } = data;

            if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                console.error('Invalid userId in typing event:', userId);
                socket.emit('error', 'Invalid userId');
                return;
            }

            if (sender === 'Admin') {
                const userSocketId = connectedUsers.get(userId);
                if (userSocketId) {
                    io.to(userSocketId).emit('typing', { isTyping });
                }
            } else {
                adminSockets.forEach(adminSocketId => {
                    io.to(adminSocketId).emit('typing', { userId, isTyping });
                });
            }
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log('Socket disconnected:', socket.id);
            // Gỡ socket.id khỏi adminSockets
            adminSockets.delete(socket.id);

            // Tìm userId tương ứng trong connectedUsers và xóa khỏi map
            for (const [userId, socketId] of connectedUsers.entries()) {
                if (socketId === socket.id) {
                    console.log('User disconnected:', userId);
                    connectedUsers.delete(userId);

                    // Gửi thông báo cho admin
                    adminSockets.forEach(adminSocketId => {
                        io.to(adminSocketId).emit('userOffline', userId);
                    });
                    break;
                }
            }
        });
    });
};

export default chatSocket; 