import mongoose from "mongoose";

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    logoUrl: {
        type: String,
    },
    description: {
        type: String,
    }
})

const Brand = mongoose.model('Brand', brandSchema);

export default Brand;