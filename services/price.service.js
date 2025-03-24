import Product from "../models/product.model.js";

const calculateTotalPriceInCart = async (cart) => {
    let totalPrice = 0;
    for (const item of cart.products) {
        const product = await Product.findById(item?.product);
        if (product) {
            totalPrice += product?.price * item?.quantity;
        }
    }
    return totalPrice;
}

export default {
    calculateTotalPriceInCart,
}