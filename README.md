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

## API Endpoints

### User
- `POST /api/user/auth/signup` - Đăng ký tài khoản
- `POST /api/user/auth/login` - Đăng nhập
- `POST /api/user/auth/signout` - Đăng xuất
- `POST /api/user/auth/forgot-password` - Quên mật khẩu
- `POST /api/user/auth/reset-password/:token` - Đặt lại mật khẩu
- `POST /api/user/auth/change-password` - Đổi mật khẩu
- `GET /api/user/profile` - Lấy thông tin người dùng
- `PATCH /api/user/profile` - Cập nhật thông tin
- `PATCH /api/user/avatar` - Cập nhật avatar

### Product
- `GET /api/product` - Lấy tất cả sản phẩm
- `GET /api/product/:id` - Lấy chi tiết sản phẩm
- `POST /api/product` - Tạo sản phẩm mới
- `PUT /api/product/:id` - Cập nhật sản phẩm
- `DELETE /api/product/:id` - Xóa sản phẩm

### Order
- `POST /api/order/create` - Tạo đơn hàng
- `GET /api/order/user` - Lấy đơn hàng của người dùng
- `GET /api/order/:id` - Lấy chi tiết đơn hàng
- `PATCH /api/order/:id/status` - Cập nhật trạng thái đơn hàng

### Cart
- `GET /api/cart` - Lấy giỏ hàng
- `POST /api/cart/add` - Thêm sản phẩm vào giỏ
- `PATCH /api/cart/update` - Cập nhật giỏ hàng
- `DELETE /api/cart/remove/:id` - Xóa sản phẩm khỏi giỏ

### Review
- `POST /api/review/create` - Tạo đánh giá
- `GET /api/review/product/:id` - Lấy đánh giá của sản phẩm

### Chat
- Socket.io events cho chat realtime

## Liên hệ

Nguyễn Đình Tú - tu700131@gmail.com

