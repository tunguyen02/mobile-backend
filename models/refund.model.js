import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
        },
        paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected", "Processed", "Failed"],
            default: "Pending",
        },
        processedAt: {
            type: Date,
        },
        transactionRef: {
            type: String,
        },
        adminNote: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

const Refund = mongoose.model("Refund", refundSchema);

export default Refund; 