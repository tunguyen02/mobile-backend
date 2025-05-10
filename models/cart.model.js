import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    products: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            }
        }
    ],
    totalPrice: {
        type: Number,
        min: 0,
        required: true
    },
    flashSaleProducts: {
        type: Map,
        of: new mongoose.Schema({
            flashSaleId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "FlashSale",
                required: true
            },
            discountPrice: {
                type: Number,
                required: true,
                min: 0
            }
        }, { _id: false }),
        default: {}
    }
}, {
    timestamps: true,
});

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;