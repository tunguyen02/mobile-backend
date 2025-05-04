import express from 'express';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import { createServer } from 'http';
import routes from './routes/index.js';
import chatSocket from './socket/chat.socket.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST']
    }
});

// Biến toàn cục để theo dõi người dùng đang kết nối
app.locals.connectedUsers = new Map();

app.use(morgan('dev'));

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize socket và chia sẻ biến connectedUsers
chatSocket(io, app.locals.connectedUsers);

// API routes
routes(app);

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to DB Successfully');
    })
    .catch((err) => {
        console.log(err);
    });

httpServer.listen(process.env.PORT, () => {
    console.log('Server is running in port: ' + process.env.PORT);
});