import cartService from "../services/cart.service.js";
import productService from "../services/product.service.js";

const cartController = {
    getMyCart: async (req, res) => {
        const userId = req?.user?._id;
        if (!userId) {
            return res.status(401).json({
                message: "Please login"
            });
        }

        try {
            const cart = await cartService.getMyCart(userId);
            return res.status(200).json({
                message: "Get cart successfully",
                cart
            });
        }
        catch (err) {
            console.log(err.message);
            return res.status(500).json({
                message: "Get cart failed"
            });
        }
    },

    updateProduct: async (req, res) => {
        const userId = req?.user?._id;
        const { productId, quantity } = req.body;

        if (!userId) {
            return res.status(401).json({
                message: "Please login"
            });
        }

        if (!productId) {
            return res.status(400).json({
                message: "Missing product ID"
            });
        }

        try {
            const product = await productService.getProductById(productId);
            if (!product) {
                const cart = await cartService.updateProduct(userId, productId, 0);
                return res.status(404).json({
                    message: "Product not found"
                });
            }

            const cart = await cartService.updateProduct(userId, productId, quantity);
            return res.status(200).json({
                cart,
                message: "Update product in cart successfully"
            });
        }
        catch (err) {
            return res.status(500).json({
                message: "Update product in cart failed"
            })
        }
    },

    addProductToCart: async (req, res) => {
        const userId = req?.user?._id;
        const { productId, isFlashSale, flashSaleId, discountPrice } = req.body;

        if (!userId) {
            return res.status(401).json({
                message: "Please login"
            });
        }

        if (!productId) {
            return res.status(400).json({
                message: "Missing product ID"
            });
        }

        try {
            const product = await productService.getProductById(productId);
            if (!product) {
                const cart = await cartService.updateProduct(userId, productId, 0);
                return res.status(404).json({
                    message: "Product not found"
                });
            }

            // Nếu là sản phẩm Flash Sale, thêm thông tin này
            if (isFlashSale && flashSaleId && discountPrice) {
                console.log(`Adding Flash Sale product: ${productId}, Flash Sale ID: ${flashSaleId}, Price: ${discountPrice}`);
                // Lưu thông tin Flash Sale vào session hoặc cache để sử dụng khi tạo đơn hàng
                const cart = await cartService.addProductToCart(userId, productId, {
                    isFlashSale,
                    flashSaleId,
                    discountPrice
                });
                return res.status(200).json({
                    cart,
                    message: "Thêm sản phẩm vao giỏ hàng thành công",
                });
            }

            const cart = await cartService.addProductToCart(userId, productId);
            return res.status(200).json({
                cart,
                message: "Thêm sản phẩm vào giỏ hàng thành công",
            });
        }
        catch (err) {
            console.error("Error adding product to cart:", err);
            return res.status(500).json({
                message: "Create product in cart failed"
            })
        }
    }
}

export default cartController;