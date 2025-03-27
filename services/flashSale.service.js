import FlashSale from '../models/flashSale.model.js';
import Product from '../models/product.model.js';

const flashSaleService = {
    createFlashSale: async (data) => {
        try {
            const { title, startTime, endTime, products } = data;

            // Validate time
            if (startTime >= endTime) {
                throw new Error('End time must be after start time');
            }

            // Validate products
            for (const item of products) {
                const product = await Product.findById(item.product);
                if (!product) {
                    throw new Error(`Product ${item.product} not found`);
                }
                if (item.quantity > product.countInStock) {
                    throw new Error(`Product ${product.name} has insufficient stock`);
                }
            }

            const flashSale = await FlashSale.create({
                title,
                startTime,
                endTime,
                products
            });

            return flashSale;
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
                for (const item of data.products) {
                    const product = await Product.findById(item.product);
                    if (!product) {
                        throw new Error(`Product ${item.product} not found`);
                    }
                    if (item.quantity > product.countInStock) {
                        throw new Error(`Product ${product.name} has insufficient stock`);
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

    updateSoldCount: async (flashSaleId, productId, quantity) => {
        try {
            const flashSale = await FlashSale.findById(flashSaleId);
            if (!flashSale) {
                throw new Error('Flash sale not found');
            }

            const productIndex = flashSale.products.findIndex(
                item => item.product.toString() === productId
            );

            if (productIndex === -1) {
                throw new Error('Product not found in flash sale');
            }

            const product = flashSale.products[productIndex];
            if (product.soldCount + quantity > product.quantity) {
                throw new Error('Insufficient quantity in flash sale');
            }

            product.soldCount += quantity;
            await flashSale.save();

            return flashSale;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

export default flashSaleService; 