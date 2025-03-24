import Product from "../models/product.model.js";
import ProductDetails from "../models/productDetails.model.js";

const productDetailService = {
    createProductDetail: async (data) => {
        try {
            const product = await Product.findById(data.product);
            if (!product) {
                throw new Error("Product not found");
            }
            const productDetail = await ProductDetails.create(data);
            return productDetail;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    getProductDetail: async (product) => {
        try {
            const productDetail = await ProductDetails.findOne({ product });
            return productDetail;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    updateProductDetail: async (productId, data) => {
        try {
            let productDetail = await ProductDetails.findOne({ product: productId });

            if (productDetail) {
                productDetail = await ProductDetails.findOneAndUpdate(
                    { product: productId },
                    data,
                    { new: true }
                );
            } else {
                productDetail = await ProductDetails.create({
                    ...data,
                    product: productId
                });
            }

            return productDetail;
        } catch (error) {
            throw new Error(error.message);
        }
    },


    deleteProductDetail: async (productId) => {
        try {
            await ProductDetails.findByIdAndDelete(productId);
            return true;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

export default productDetailService;