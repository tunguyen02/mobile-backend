import mongoose from "mongoose";
import Cart from "../models/cart.model.js";
import priceService from "./price.service.js";

const cartService = {
    getMyCart: async (userId) => {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("UserId invalid")
        }

        try {
            let cart = await Cart.findOne({ userId }).populate('products.product', 'id name price imageUrl color countInStock');

            if (!cart) {
                cart = new Cart({
                    userId,
                    products: [],
                    totalPrice: 0
                })
                await cart.save();
                return await Cart.findOne({ userId });
            }

            return cart;
        }
        catch (err) {
            throw new Error(err.message);
        }
    },

    updateProduct: async (userId, productId, quantity) => {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("User ID invalid");
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new Error("Product ID invalid");
        }

        quantity = Number.parseInt(quantity);
        if (isNaN(quantity) || quantity < 0) {
            throw new Error("Quantity invalid");
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            let cart = await cartService.getMyCart(userId);

            // Kiểm tra sản phẩm đã tồn tại trong giỏ hàng chưa
            const productIndex = cart.products.findIndex(
                (p) => p.product._id.toString() === productId
            );

            if (quantity > 0) {
                if (productIndex >= 0) {
                    // Nếu đã tồn tại, tăng số lượng        
                    cart.products[productIndex].quantity = quantity;
                } else {
                    // Nếu chưa tồn tại, thêm sản phẩm vào giỏ
                    cart.products.push({
                        product: productId,
                        quantity: quantity,
                    });
                }
            }
            else if (quantity === 0) {
                cart.products.splice(productIndex, 1);
            }

            // Cập nhật tổng giá
            cart.totalPrice = await priceService.calculateTotalPriceInCart(cart);

            await cart.save({ session });

            await session.commitTransaction();
            await session.endSession();

            return await cartService.getMyCart(userId);
        } catch (error) {
            await session.abortTransaction();
            await session.endSession();
            throw new Error(error.message);
        }
    },

    addProductToCart: async (userId, productId, flashSaleInfo = null) => {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("User ID invalid");
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new Error("Product ID invalid");
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            let cart = await cartService.getMyCart(userId);

            // Kiểm tra sản phẩm đã tồn tại trong giỏ hàng chưa
            const productIndex = cart.products.findIndex(
                (p) => p.product._id.toString() === productId
            );

            if (productIndex >= 0) {
                // Nếu đã tồn tại, tăng số lượng
                cart.products[productIndex].quantity++;
            } else {
                // Nếu chưa tồn tại, thêm sản phẩm vào giỏ
                cart.products.push({
                    product: productId,
                    quantity: 1,
                });
            }

            // Nếu là sản phẩm flash sale, lưu thông tin
            if (flashSaleInfo) {
                // Nếu chưa có flashSaleProducts trong cart, tạo mới
                if (!cart.flashSaleProducts) {
                    cart.flashSaleProducts = {};
                }
                // Lưu thông tin Flash Sale
                cart.flashSaleProducts[productId] = {
                    flashSaleId: flashSaleInfo.flashSaleId,
                    discountPrice: flashSaleInfo.discountPrice
                };

                console.log("Updated Flash Sale Products in cart:", cart.flashSaleProducts);
            }

            // Cập nhật tổng giá
            cart.totalPrice = await priceService.calculateTotalPriceInCart(cart);

            await cart.save({ session });

            await session.commitTransaction();
            await session.endSession();

            return await cartService.getMyCart(userId);
        } catch (error) {
            await session.abortTransaction();
            await session.endSession();
            throw new Error(error.message);
        }
    },
    clearCart: async (userId, session) => {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("UserId invalid");
        }

        let cart = await Cart.findOne({ userId });
        cart.products = [];
        cart.totalPrice = 0;

        return await cart.save({ session });
    }
}

export default cartService;