import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: "7781eb59c99f81", // Thay bằng username của bạn
        pass: "4b72f7554cc9ed"  // Thay bằng password của bạn
    }
});

const compileTemplate = (templateName, data) => {
    const sourceHtml = fs.readFileSync(path.resolve(__dirname, `../templateEmails/${templateName}.html`), { encoding: "utf8" });
    const template = handlebars.compile(sourceHtml);
    return template(data);
};

export const sendEmail = async (options) => {
    const mailOptions = {
        from: 'Mobile - Tu Nguyen <noreply@mobile.com>',
        to: options.email,
        subject: options.subject,
        text: options.text,
        html: options.html
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
    } catch (error) {
        console.error('Failed to send email:', error);
        throw error;
    }
};

export const sendCreateOrderEmail = async (order, email) => {
    try {
        console.log("Order data received:", JSON.stringify(order, null, 2));

        // Định dạng lại dữ liệu sản phẩm
        const formattedProducts = order.products.map(item => {
            let product, price, quantity;

            // Xác định cấu trúc đúng của dữ liệu sản phẩm dựa trên dữ liệu nhận được
            if (item.product) {
                // Trường hợp item.product là object chứa thông tin sản phẩm
                product = item.product;
                price = item.price || 0;
                quantity = item.quantity || 1;
            } else if (item.name) {
                // Trường hợp item chính là thông tin sản phẩm
                product = item;
                price = item.price || 0;
                quantity = item.quantity || 1;
            } else {
                // Trường hợp mặc định, tạo object với giá trị mặc định
                product = {};
                price = 0;
                quantity = 1;
            }

            return {
                product: {
                    name: product.name || 'Sản phẩm',
                    color: product.color || ''
                },
                price: price,
                quantity: quantity,
                priceFormatted: price.toLocaleString("vi-VN"),
                totalPriceFormatted: (price * quantity).toLocaleString("vi-VN"),
            };
        });

        // Định dạng dữ liệu đơn hàng
        const orderData = {
            ...order,
            createdAtFormatted: new Date(order.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
            subTotalFormatted: order.subTotal.toLocaleString("vi-VN"),
            shippingPriceFormatted: order.shippingPrice.toLocaleString("vi-VN"),
            totalPriceFormatted: order.totalPrice.toLocaleString("vi-VN"),
            products: formattedProducts
        };

        console.log("Formatted order data:", JSON.stringify(orderData, null, 2));

        const html = compileTemplate('createOrder', { order: orderData });

        const text = `
            Cảm ơn bạn đã đặt hàng!
            Mã đơn hàng: ${order._id}
            Ngày đặt: ${orderData.createdAtFormatted}
            Tổng tiền: ${orderData.totalPriceFormatted} VNĐ
        `;

        await sendEmail({
            email: email,
            subject: "Xác nhận đặt hàng",
            text: text,
            html: html
        });
    } catch (error) {
        console.error("Error formatting order data:", error);
        throw error;
    }
};

export const sendResetPasswordEmail = async (user, resetToken) => {
    try {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        const name = user.name || user.email;

        console.log('Sending reset password email to:', user.email);
        console.log('Reset password URL:', resetUrl);

        const html = compileTemplate('resetPassword', {
            name: name,
            resetUrl: resetUrl
        });

        const text = `
            Xin chào ${name},
            Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng nhấp vào liên kết sau để đặt lại mật khẩu:
            ${resetUrl}
            Liên kết này sẽ hết hạn sau 10 phút.
        `;

        await sendEmail({
            email: user.email,
            subject: "Đặt lại mật khẩu",
            text: text,
            html: html
        });

        console.log('Reset password email sent successfully to:', user.email);
    } catch (error) {
        console.error('Error sending reset password email:', error);
        throw error;
    }
};

export const sendPasswordChangedEmail = async (user) => {
    const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    const name = user.name || user.email;

    const html = compileTemplate('passwordChanged', {
        name: name,
        time: now
    });

    const text = `
        Xin chào ${name},
        Mật khẩu của tài khoản bạn đã được thay đổi thành công vào ${now}.
        Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với chúng tôi ngay lập tức.
    `;

    await sendEmail({
        email: user.email,
        subject: "Mật khẩu đã được thay đổi",
        text: text,
        html: html
    });
};
