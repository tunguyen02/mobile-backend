import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
    },
});

export const sendCreateOrderEmail = async (order, email) => {
    const sourceHtml = fs.readFileSync(path.resolve(__dirname, "../templateEmails/createOrder.html"), { encoding: "utf8" });

    const template = handlebars.compile(sourceHtml);

    const orderData = order.toObject();

    orderData.createdAtFormatted = new Date(order.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    orderData.subTotalFormatted = order.subTotal.toLocaleString("vi-VN");
    orderData.shippingPriceFormatted = order.shippingPrice.toLocaleString("vi-VN");
    orderData.totalPriceFormatted = order.totalPrice.toLocaleString("vi-VN");

    orderData.products = orderData.products.map(product => ({
        ...product,
        priceFormatted: product.price.toLocaleString("vi-VN"),
        totalPriceFormatted: (product.price * product.quantity).toLocaleString("vi-VN"),
    }));

    const context = { order: orderData };

    const createOrderHtml = template(context);

    const mailOptions = {
        from: process.env.MAIL_ACCOUNT,
        to: email,
        subject: "Xác nhận đặt hàng",
        text: "Đặt hàng thành công!",
        html: createOrderHtml,
    };

    await transporter.sendMail(mailOptions);
};
