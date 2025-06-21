# Mobile E-commerce Backend API

## Giới thiệu

Backend API cho ứng dụng di động thương mại điện tử, xây dựng trên Node.js, Express và MongoDB (Mongoose). Dự án hỗ trợ đầy đủ các chức năng của một nền tảng thương mại điện tử, bao gồm quản lý người dùng, sản phẩm, giỏ hàng, đơn hàng, đánh giá, chat trực tuyến, và nhiều tính năng khác.

## Tính năng

### Quản lý người dùng
- Đăng ký, đăng nhập, đăng xuất
- Quên mật khẩu & đặt lại mật khẩu
- Đổi mật khẩu
- Cập nhật thông tin cá nhân & avatar
- Xác thực và phân quyền

### Quản lý sản phẩm
- CRUD sản phẩm và chi tiết sản phẩm
- Quản lý thương hiệu
- Tìm kiếm và lọc sản phẩm
- Flash sale & khuyến mãi

### Đơn hàng & Giỏ hàng
- Thêm, sửa, xóa sản phẩm trong giỏ hàng
- Tạo và quản lý đơn hàng
- Theo dõi trạng thái đơn hàng
- Gửi email xác nhận đơn hàng

### Đánh giá & Bình luận
- Đánh giá sản phẩm (rating 1-5 sao)

### Chat & Hỗ trợ
- Chat realtime giữa người dùng và quản trị viên
- Hỗ trợ socket.io
- Đánh dấu tin nhắn đã đọc
- Thông báo tin nhắn mới


### Báo cáo & Xuất dữ liệu
- Xuất báo cáo CSV
- Thống kê sản phẩm
- Thống kê đơn hàng

## Cấu trúc dự án

```
├── config/             # Cấu hình dự án
├── controllers/        # Xử lý logic điều hướng API
├── middlewares/        # Middleware (auth)
├── models/             # Schema và model Mongoose
├── routes/             # Định nghĩa API routes
├── services/           # Xử lý logic nghiệp vụ
├── socket/             # Xử lý kết nối Socket.io
├── templateEmails/     # Mẫu email HTML
├── .env                # Biến môi trường
├── .gitignore          # Loại trừ file Git
├── index.js            # Điểm khởi đầu ứng dụng
├── package.json        # Thông tin và dependencies
└── README.md           # Tài liệu dự án
```

## Công nghệ

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - MongoDB ODM
- **Socket.io** - Realtime chat
- **JWT** - Authentication
- **Nodemailer** - Email sending
- **Multer** - File upload
- **Cloudinary** - Image storage
- **Handlebars** - Email templates

## Cài đặt

1. Clone repository:
```bash
git clone https://github.com/tunguyen02/mobile-backend.git
cd mobile-backend
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file .env như file .env.example
```bash
MONGODB_URI=
PORT=
JWT_SECRET=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=
JWT_REFRESH_EXPIRES_IN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
EMAIL_USERNAME=
EMAIL_PASSWORD=
```

4. Khởi chạy server:
```bash
npm run dev
```


## Liên hệ

Nguyễn Đình Tú - tu700131@gmail.com

## Cấu hình VNPay

Để sử dụng tích hợp thanh toán VNPay, bạn cần thêm các biến môi trường sau vào file `.env`:

```
# Cấu hình VNPay
VNPAY_TMN_CODE=YOUR_MERCHANT_CODE
VNPAY_HASH_SECRET=YOUR_HASH_SECRET
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:8080/api/payment/vnpay/return
VNPAY_IPN_URL=http://localhost:8080/api/payment/vnpay/ipn
```

Trong đó:
- `VNPAY_TMN_CODE`: Mã merchant do VNPay cấp
- `VNPAY_HASH_SECRET`: Khóa bí mật do VNPay cấp
- `VNPAY_URL`: URL sandbox hoặc production của VNPay
- `VNPAY_RETURN_URL`: URL endpoint xử lý kết quả thanh toán (người dùng được chuyển hướng về)
- `VNPAY_IPN_URL`: URL endpoint xử lý thông báo kết quả thanh toán (VNPay gọi trực tiếp)

**Lưu ý quan trọng:** Khi chạy trên môi trường `localhost` để phát triển, VNPay sẽ không thể gửi yêu cầu xác nhận thanh toán (IPN) đến máy của bạn. Để xử lý việc này, bạn cần sử dụng một công cụ như [ngrok](https://ngrok.com/) để tạo một đường hầm (tunnel) công khai tới cổng `8080` (hoặc cổng mà server backend của bạn đang chạy).

Sau khi chạy ngrok (ví dụ: `ngrok http 8080`), bạn sẽ nhận được một URL công khai (ví dụ: `https://your-ngrok-id.ngrok.io`). Bạn phải cập nhật các biến `VNPAY_RETURN_URL` và `VNPAY_IPN_URL` trong file `.env` bằng URL này.

Ví dụ:
```
VNPAY_RETURN_URL=https://your-ngrok-id.ngrok.io/api/payment/vnpay/return
VNPAY_IPN_URL=https://your-ngrok-id.ngrok.io/api/payment/vnpay/ipn
```
