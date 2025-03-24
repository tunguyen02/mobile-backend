import Payment from '../models/payment.model.js'

const paymentService = {
    createPayment: async (orderId, data, session) => {
        let { paymentMethod, amountPaid, transactionId, paymentStatus } = data;
        let paidAt = null;

        if (paymentStatus === "Completed") {
            paidAt = new Date();
        }

        const newPayment = new Payment({
            orderId,
            paymentMethod,
            amountPaid,
            transactionId,
            paymentStatus,
        });

        return await newPayment.save({ session });
    }
}

export default paymentService;