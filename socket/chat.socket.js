import chatService from '../services/chat.service.js';

const chatSocket = (io) => {
    const connectedUsers = new Map();

    io.on('connection', (socket) => {
        // User joins
        socket.on('join', (userId) => {
            connectedUsers.set(userId, socket.id);
        });

        // Send message
        socket.on('sendMessage', async (data) => {
            try {
                const { userId, sender, content, type } = data;
                const chat = await chatService.sendMessage(userId, sender, content, type);

                // Send to receiver if online
                const receiverSocketId = connectedUsers.get(userId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('newMessage', chat);
                }

                // Send back to sender
                socket.emit('messageSent', chat);
            } catch (error) {
                socket.emit('error', error.message);
            }
        });

        // Mark as read
        socket.on('markAsRead', async (data) => {
            try {
                const { userId, sender } = data;
                const chat = await chatService.markAsRead(userId, sender);
                socket.emit('messagesRead', chat);
            } catch (error) {
                socket.emit('error', error.message);
            }
        });

        // Disconnect
        socket.on('disconnect', () => {
            for (const [userId, socketId] of connectedUsers.entries()) {
                if (socketId === socket.id) {
                    connectedUsers.delete(userId);
                    break;
                }
            }
        });
    });
};

export default chatSocket; 