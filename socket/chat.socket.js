import chatService from '../services/chat.service.js';

const chatSocket = (io, connectedUsers) => {
    // Sử dụng biến connectedUsers được truyền vào hoặc tạo mới nếu không có
    const users = connectedUsers || new Map();
    console.log('Chat socket initialized');

    // Logging active connections
    const logActiveConnections = () => {
        console.log('Active connections:', users.size);
        let connectedUsersArray = [];
        for (const [userId, userData] of users.entries()) {
            connectedUsersArray.push({ 
                userId, 
                socketId: userData.socketId,
                role: userData.role || 'Unknown'
            });
        }
        console.log('Connected users:', connectedUsersArray);
    };

    io.on('connection', (socket) => {
        console.log('New socket connection:', socket.id);

        // User joins
        socket.on('join', (data) => {
            try {
                let userId;
                let userRole = 'User';
                
                // Kiểm tra định dạng dữ liệu
                if (typeof data === 'object' && data !== null) {
                    // Định dạng mới có thông tin userId và role
                    userId = data.userId;
                    userRole = data.role || 'User';
                    console.log(`User ${userId} (${userRole}) joined socket with ID ${socket.id}`);
                } else {
                    // Định dạng cũ chỉ có userId
                    userId = data;
                    console.log(`User ${userId} joined socket with ID ${socket.id} (legacy format)`);
                }
                
                if (userId) {
                    users.set(userId, {
                        socketId: socket.id,
                        role: userRole
                    });
                    
                    logActiveConnections();
                    
                    // Notify that user is online
                    socket.broadcast.emit('userOnline', userId);
                }
            } catch (error) {
                console.error('Error handling join event:', error);
            }
        });

        // Send message
        socket.on('sendMessage', async (data) => {
            try {
                console.log('Socket received sendMessage event:', data);
                const { receiverId, senderId, senderRole, content } = data;
                
                // Tạo data object cho service
                const messageData = {
                    userId: receiverId,
                    content,
                    sender: senderRole
                };
                
                // Gửi tin nhắn qua service
                const chat = await chatService.sendMessage(messageData);

                // Send to receiver if online
                const receiverSocket = getUserSocket(receiverId);
                if (receiverSocket) {
                    console.log(`Receiver ${receiverId} is online, sending message directly`);
                    io.to(receiverSocket).emit('newMessage', {
                        senderId,
                        senderRole,
                        content,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    console.log(`Receiver ${receiverId} is offline, message saved to database`);
                }

                // Send back to sender
                socket.emit('messageSent', {
                    receiverId,
                    senderId,
                    senderRole,
                    content,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error in sendMessage socket handler:', error);
                socket.emit('error', error.message);
            }
        });

        // Handler cho sự kiện newMessage được emit từ client
        socket.on('newMessage', async (data) => {
            try {
                console.log('Socket received newMessage event from client:', data);
                const { receiverId, senderId, senderRole, content } = data;
                
                // Kiểm tra nếu receiver đang online
                const receiverData = users.get(receiverId);
                if (receiverData && receiverData.socketId) {
                    console.log(`Receiver ${receiverId} is online, notifying about new message`);
                    io.to(receiverData.socketId).emit('newMessage', {
                        senderId,
                        senderRole,
                        content,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    console.log(`Receiver ${receiverId} is offline, no notification sent`);
                }
            } catch (error) {
                console.error('Error in newMessage socket handler:', error);
                socket.emit('error', error.message);
            }
        });

        // Mark as read
        socket.on('markAsRead', async (data) => {
            try {
                console.log('Socket received markAsRead event:', data);
                const { userId, sender } = data;
                const chat = await chatService.markAsRead(userId, sender);
                
                // Notify sender that messages were read
                socket.emit('messagesRead', chat);
                
                // Notify receiver if online
                const receiverData = users.get(userId);
                if (receiverData && receiverData.socketId) {
                    io.to(receiverData.socketId).emit('messagesRead', chat);
                }
            } catch (error) {
                console.error('Error in markAsRead socket handler:', error);
                socket.emit('error', error.message);
            }
        });

        // Check if user is online
        socket.on('checkUserStatus', (userId) => {
            const isOnline = users.has(userId);
            socket.emit('userStatus', { userId, isOnline });
        });

        // Disconnect
        socket.on('disconnect', () => {
            let disconnectedUserId = null;
            for (const [userId, userData] of users.entries()) {
                if (userData.socketId === socket.id) {
                    disconnectedUserId = userId;
                    users.delete(userId);
                    break;
                }
            }
            
            if (disconnectedUserId) {
                console.log(`User ${disconnectedUserId} disconnected`);
                // Notify other users that this user is offline
                socket.broadcast.emit('userOffline', disconnectedUserId);
            }
            
            logActiveConnections();
        });
    });
};

export default chatSocket; 