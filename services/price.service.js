import Product from "../models/product.model.js";

const calculateTotalPriceInCart = async (cart) => {
    let totalPrice = 0;

    const flashSaleProducts = cart.flashSaleProducts || {};

    for (const item of cart.products) {
        const productId = item?.product?._id?.toString() || item?.product?.toString();
        const product = await Product.findById(item?.product);

        if (product) {
            if (flashSaleProducts && flashSaleProducts[productId]) {
                totalPrice += flashSaleProducts[productId].discountPrice * item?.quantity;
            } else {
                totalPrice += product?.price * item?.quantity;
            }
        }
    }
    return totalPrice;
}

export default {
    calculateTotalPriceInCart,
}