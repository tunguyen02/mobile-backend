import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    messages: [{
        sender: {
            type: String,
            enum: ['User', 'Admin'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        isRead: {
            type: Boolean,
            default: false
        },
        type: {
            type: String,
            enum: ['Text', 'Image'],
            default: 'Text'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['Open', 'Closed'],
        default: 'Open'
    },
    lastMessage: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const Chat = mongoose.model('Chat', chatSchema);
export default Chat; 