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

export const sendResetPasswordEmail = async (user, resetToken) => {
    const sourceHtml = fs.readFileSync(path.resolve(__dirname, "../templateEmails/resetPassword.html"), { encoding: "utf8" });

    const template = handlebars.compile(sourceHtml);

    // Tạo URL đặt lại mật khẩu với token
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const context = {
        name: user.name || user.email,
        resetUrl: resetUrl
    };

    const resetPasswordHtml = template(context);

    const mailOptions = {
        from: process.env.MAIL_ACCOUNT,
        to: user.email,
        subject: "Đặt lại mật khẩu",
        text: `Nhấp vào đường dẫn sau để đặt lại mật khẩu: ${resetUrl}`,
        html: resetPasswordHtml,
    };

    await transporter.sendMail(mailOptions);
};

export const sendPasswordChangedEmail = async (user) => {
    const sourceHtml = fs.readFileSync(path.resolve(__dirname, "../templateEmails/passwordChanged.html"), { encoding: "utf8" });

    const template = handlebars.compile(sourceHtml);

    const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

    const context = {
        name: user.name || user.email,
        time: now
    };

    const passwordChangedHtml = template(context);

    const mailOptions = {
        from: process.env.MAIL_ACCOUNT,
        to: user.email,
        subject: "Mật khẩu đã được thay đổi",
        text: `Mật khẩu của tài khoản bạn đã được thay đổi thành công vào ${now}.`,
        html: passwordChangedHtml,
    };

    await transporter.sendMail(mailOptions);
};
