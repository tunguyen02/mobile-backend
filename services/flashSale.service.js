import FlashSale from '../models/flashSale.model.js';
import Product from '../models/product.model.js';

const flashSaleService = {
    createFlashSale: async (data) => {
        try {
            const { title, startTime, endTime, products } = data;

            if (startTime >= endTime) {
                throw new Error('End time must be after start time');
            }

            for (const item of products) {
                console.log(`Validating product: ${item.product}`);
                try {
                    const product = await Product.findById(item.product);
                    if (!product) {
                        throw new Error(`Product ${item.product} not found`);
                    }

                    console.log(`Found product: ${product.name}, stock: ${product.countInStock}, requested: ${item.quantity}`);

                    if (item.quantity > product.countInStock) {
                        throw new Error(`Product ${product.name} has insufficient stock. Available: ${product.countInStock}, Requested: ${item.quantity}`);
                    }
                } catch (err) {
                    console.error(`Error validating product ${item.product}:`, err);
                    throw err;
                }
            }

            console.log('Creating flash sale in database');
            const flashSale = await FlashSale.create({
                title,
                startTime,
                endTime,
                products
            });

            return flashSale;
        } catch (error) {
            console.error('Error in createFlashSale service:', error);
            throw error;
        }
    },

    getAllFlashSales: async () => {
        try {
            const flashSales = await FlashSale.find()
                .populate('products.product', 'name price imageUrl');

            return flashSales;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    getActiveFlashSales: async () => {
        try {
            const now = new Date();
            const flashSales = await FlashSale.find({
                isActive: true,
                startTime: { $lte: now },
                endTime: { $gte: now }
            })
                .populate('products.product', 'name price imageUrl');

            return flashSales;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    getFlashSaleById: async (id) => {
        try {
            const flashSale = await FlashSale.findById(id)
                .populate('products.product', 'name price imageUrl');

            if (!flashSale) {
                throw new Error('Flash sale not found');
            }

            return flashSale;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    updateFlashSale: async (id, data) => {
        try {
            const flashSale = await FlashSale.findById(id);
            if (!flashSale) {
                throw new Error('Flash sale not found');
            }

            if (data.startTime && data.endTime) {
                if (data.startTime >= data.endTime) {
                    throw new Error('End time must be after start time');
                }
            }

            if (data.products) {
                // Lưu lại map của soldCount hiện tại trước khi cập nhật
                const currentSoldCounts = {};
                flashSale.products.forEach(item => {
                    const productId = item.product.toString();
                    currentSoldCounts[productId] = item.soldCount || 0;
                });

                // Kiểm tra các sản phẩm mới
                for (const item of data.products) {
                    const product = await Product.findById(item.product);
                    if (!product) {
                        throw new Error(`Product ${item.product} not found`);
                    }
                    if (item.quantity > product.countInStock) {
                        throw new Error(`Product ${product.name} has insufficient stock`);
                    }

                    // Giữ lại soldCount cho các sản phẩm đã tồn tại
                    const productId = item.product.toString();
                    if (currentSoldCounts[productId] !== undefined) {
                        item.soldCount = currentSoldCounts[productId];
                    }
                }
            }

            Object.assign(flashSale, data);
            await flashSale.save();

            return flashSale;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    deleteFlashSale: async (id) => {
        try {
            const flashSale = await FlashSale.findById(id);
            if (!flashSale) {
                throw new Error('Flash sale not found');
            }

            await flashSale.deleteOne();
            return true;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    updateSoldCount: async (flashSaleId, productId, quantityToDecrement) => {
        try {
            const updatedFlashSale = await FlashSale.findOneAndUpdate(
                {
                    _id: flashSaleId,
                    'products.product': productId,
                    // Điều kiện cốt lõi: Đảm bảo không bán vượt số lượng
                    // Chỉ tìm và cập nhật document nếu biểu thức này đúng
                    $expr: { $gte: ["$products.$[elem].quantity", { $add: ["$products.$[elem].soldCount", quantityToDecrement] }] }
                },
                {
                    // Tăng soldCount một cách nguyên tử
                    $inc: { 'products.$[elem].soldCount': quantityToDecrement }
                },
                {
                    new: true, // Trả về document sau khi đã cập nhật
                    arrayFilters: [{ 'elem.product': productId }]
                }
            );

            if (!updatedFlashSale) {
                // Nếu không tìm thấy document nào thoả mãn, có nghĩa là đã hết hàng
                throw new Error('Insufficient quantity in flash sale or product not found.');
            }

            return updatedFlashSale;
        } catch (error) {
            // Ném lỗi để controller có thể bắt và xử lý
            throw error;
        }
    }
};

export default flashSaleService; 