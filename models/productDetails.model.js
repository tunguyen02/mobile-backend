import mongoose from "mongoose";

const productDetailsSchema = new mongoose.Schema({
    specifications: {
        os: {
            type: String,
            default: ""
        },
        cpu: {
            type: String,
            default: ""
        },
        gpu: {
            type: String,
            default: ""
        },
        ram: {
            type: String,
            default: ""
        },
        storage: {
            type: String,
            default: ""
        }
    },
    cameraDisplay: {
        frontCamera: {
            type: String,
            default: ""
        },
        backCamera: {
            type: String,
            default: ""
        },
        displayTech: {
            type: String,
            default: ""
        },
        displayResolution: {
            type: String,
            default: ""
        },
        displayWidth: {
            type: String,
            default: ""
        },
        displayBrightness: {
            type: String,
            default: ""
        }
    },
    pinAdapter: {
        pinCapacity: {
            type: String,
            default: ""
        },
        pinType: {
            type: String,
            default: ""
        },
        maxAdapterPower: {
            type: String,
            default: ""
        }
    },
    designMaterial: {
        design: {
            type: String,
            default: ""
        },
        material: {
            type: String,
            default: ""
        },
        sizeWeight: {
            type: String,
            default: ""
        },
        releaseDate: {
            type: String,
            default: ""
        }
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    }
}, {
    timestamps: true,
});

const ProductDetails = mongoose.model('ProductDetails', productDetailsSchema);

export default ProductDetails;