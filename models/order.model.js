import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
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
            },
            price: {
                type: Number,
                required: true
            },
            originalPrice: {
                type: Number,
                required: true
            },
            isFlashSale: {
                type: Boolean,
                default: false
            }
        }
    ],
    shippingInfo: {
        name: {
            type: String,
            required: true
        },
        phoneNumber: {
            type: String,
            required: true
        },
        city: {
            type: String,
            default: ''
        },
        district: {
            type: String,
            default: ''
        },
        ward: {
            type: String,
            default: ''
        },
        detailedAddress: {
            type: String,
            default: ''
        }
    },
    subTotal: {
        type: Number,
        required: true,
        default: 0
    },
    shippingPrice: {
        type: Number,
        required: true,
        default: 30000
    },
    totalPrice: {
        type: Number,
        required: true,
        default: 0
    },
    shippingStatus: {
        type: String,
        enum: ["Pending", "Shipping", "Completed"],
        default: "Pending"
    },
    shippedAt: {
        type: Date
    }
}, {
    timestamps: true,
});

orderSchema.methods.calculateSubtotal = function () {
    this.subTotal = this.products.reduce((sum, item) => {
        return sum + (item.price * item.quantity)
    }, 0)
}

orderSchema.methods.calculateTotalPrice = function () {
    this.totalPrice = this.subTotal + this.shippingPrice;
}

orderSchema.pre("save", function (next) {
    this.calculateSubtotal();
    this.calculateTotalPrice();
    next();
})

const Order = mongoose.model('Order', orderSchema);

export default Order;