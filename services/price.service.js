import Product from "../models/product.model.js";

const calculateTotalPriceInCart = async (cart) => {
    let totalPrice = 0;

    // Kiểm tra xem cart có flashSaleProducts không
    const flashSaleProducts = cart.flashSaleProducts || {};

    for (const item of cart.products) {
        const productId = item?.product?._id?.toString() || item?.product?.toString();
        const product = await Product.findById(item?.product);

        if (product) {
            // Kiểm tra xem sản phẩm có trong Flash Sale không
            if (flashSaleProducts && flashSaleProducts[productId]) {
                // Sử dụng giá Flash Sale
                totalPrice += flashSaleProducts[productId].discountPrice * item?.quantity;
            } else {
                // Sử dụng giá gốc
                totalPrice += product?.price * item?.quantity;
            }
        }
    }
    return totalPrice;
}

export default {
    calculateTotalPriceInCart,
}