import mongoose from "mongoose";

const flashSaleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        discountPrice: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        soldCount: {
            type: Number,
            default: 0
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const FlashSale = mongoose.model('FlashSale', flashSaleSchema);
export default FlashSale; 