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

            // Store admin sockets separately for broadcasting
            if (role === 'Admin') {
                adminSockets.add(socket.id);

                // Notify admin about online users
                socket.emit('onlineUsers', Array.from(connectedUsers.keys()));
                console.log('Admin joined, connected users:', Array.from(connectedUsers.keys()));
            }

            // Broadcast user online status to admins
            adminSockets.forEach(adminSocketId => {
                io.to(adminSocketId).emit('userOnline', userId);
            });
        });

        // Send message
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
                console.log('Message saved to DB:', chat);

                // Send to receiver if online
                const receiverSocketId = connectedUsers.get(userId);
                if (receiverSocketId) {
                    console.log('Sending to receiver:', receiverSocketId);
                    io.to(receiverSocketId).emit('newMessage', chat);
                }

                // If sender is user and there are admins online, notify them
                if (sender === 'User') {
                    adminSockets.forEach(adminSocketId => {
                        console.log('Notifying admin:', adminSocketId);
                        io.to(adminSocketId).emit('newUserMessage', {
                            userId,
                            message: chat.messages[chat.messages.length - 1]
                        });
                    });
                }

                // Send back to sender
                console.log('Sending back to sender');
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

                // Kiểm tra userId hợp lệ
                if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                    console.error('Invalid userId in markAsRead event:', userId);
                    socket.emit('error', 'Invalid userId');
                    return;
                }

                const chat = await chatService.markAsRead(userId, sender);

                // Notify other party that messages were read
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

            // Kiểm tra userId hợp lệ
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
                // Notify admins
                adminSockets.forEach(adminSocketId => {
                    io.to(adminSocketId).emit('typing', { userId, isTyping });
                });
            }
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log('Socket disconnected:', socket.id);
            // Remove from admin sockets if it was an admin
            adminSockets.delete(socket.id);

            // Find and remove user from connected users
            for (const [userId, socketId] of connectedUsers.entries()) {
                if (socketId === socket.id) {
                    console.log('User disconnected:', userId);
                    connectedUsers.delete(userId);

                    // Notify admins about user going offline
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