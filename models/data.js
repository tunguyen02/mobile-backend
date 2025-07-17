import mongoose from 'mongoose';
import Product from './models/Product.js';
import ProductDetails from './models/ProductDetails.js';
import Brand from './models/Brand.js'; // nếu có

// Kết nối DB trước khi insert
await mongoose.connect('mongodb://localhost:27017/your-db-name'); // thay bằng DB thực tế

// Tìm brand Apple (giả sử đã có)
const brand = await Brand.findOne({ name: 'Apple' });

if (!brand) {
    throw new Error('Brand "Apple" not found. Please insert it first.');
}

// Tạo sản phẩm iPhone 16
const product = await Product.create({
    name: "iPhone 16 128GB",
    urlSlug: "iphone-16-128gb",
    originalPrice: 32990000,
    price: 30990000,
    description: "iPhone 16 với thiết kế mới, chip A18 Bionic mạnh mẽ, camera cải tiến và màn hình siêu sáng.",
    videoInfo: "https://www.youtube.com/watch?v=dummy_video",
    imageUrl: [
        "https://example.com/images/iphone16-front.jpg",
        "https://example.com/images/iphone16-back.jpg"
    ],
    color: "Midnight",
    countInStock: 50,
    brand: brand._id
});

// Tạo chi tiết sản phẩm
await ProductDetails.create({
    specifications: {
        os: "iOS 18",
        cpu: "Apple A18 Bionic",
        gpu: "Apple 6-core GPU",
        ram: "8GB",
        storage: "128GB"
    },
    cameraDisplay: {
        frontCamera: "12MP, f/1.9",
        backCamera: "48MP + 12MP (ultra-wide)",
        displayTech: "Super Retina XDR OLED",
        displayResolution: "2796 x 1290 pixels",
        displayWidth: "6.1 inches",
        displayBrightness: "2000 nits (peak)"
    },
    pinAdapter: {
        pinCapacity: "3500mAh",
        pinType: "Li-Ion, không tháo rời",
        maxAdapterPower: "30W sạc nhanh, 15W MagSafe"
    },
    designMaterial: {
        design: "Viền vuông, Dynamic Island",
        material: "Khung nhôm, mặt trước Ceramic Shield, mặt sau kính",
        sizeWeight: "146.7 x 71.5 x 7.8 mm, 172g",
        releaseDate: "Tháng 9, 2025 (dự kiến)"
    },
    product: product._id
});

console.log('Đã thêm iPhone 16 128GB cùng thông số kỹ thuật.');
await mongoose.disconnect();
