import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ["COD", "VNPay"],
        required: true
    },
    amountPaid: {
        type: Number,
        required: true
    },
    transactionId: {
        type: String
    },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Completed"],
        required: true,
        default: "Pending"
    },
    paymentDetails: {
        type: Object
    },
    paidAt: {
        type: Date
    }
}, {
    timestamps: true
})

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;