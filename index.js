import express from 'express';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import { createServer } from 'http';
import cron from 'node-cron';
import routes from './routes/index.js';
import chatSocket from './socket/chat.socket.js';
import orderService from './services/order.service.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST']
    }
});

app.use(morgan('dev'));

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize socket
chatSocket(io);

// Cron job để tự động hủy đơn hàng VNPay quá hạn 24h
cron.schedule('0 * * * *', async () => {
    console.log('Cron job: Đang kiểm tra đơn hàng VNPay quá hạn...');

    try {
        const result = await orderService.autoExpireOrders();
        console.log(`Cron job: ${result.message || 'Hoàn thành kiểm tra đơn hàng quá hạn'}`);
    } catch (error) {
        console.error('Cron job error - Không thể hủy đơn hàng quá hạn:', error);
    }
});

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