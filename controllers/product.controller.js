import brandService from "../services/brand.service.js";
import productService from "../services/product.service.js";
import cloudinaryServices from "../services/cloudinary.service.js";

const productController = {
    createProduct: async (req, res) => {
        try {
            let imageUrls = [];
            if (req.files) {
                const { listResult } = await cloudinaryServices.uploadFiles(req.files);
                imageUrls = listResult.map(result => result.secure_url);
            }
            console.log(req.files);

            const productData = { ...req.body, imageUrl: imageUrls };
            console.log("productData:", productData);
            const newProduct = await productService.createProduct(productData);
            res.status(201).json({
                success: true,
                message: "Create product successfully",
                data: newProduct
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    getProductBySlug: async (req, res) => {
        try {
            const product = await productService.getProductBySlug(req.params.slug);
            res.status(200).json({
                success: true,
                product
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    },

    getProductById: async (req, res) => {
        try {
            const product = await productService.getProductById(req.params.id);
            res.status(200).json({
                success: true,
                product
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    },

    getAllProducts: async (req, res) => {
        try {
            const { searchQuery, sortOrder, selectedBrands, page, pageSize } = req.query;
            const { products, totalProducts } = await productService.getAllProducts(searchQuery, sortOrder, selectedBrands, page, pageSize);
            res.status(200).json({
                products,
                totalProducts
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    },

    updateProduct: async (req, res) => {
        try {
            const { id } = req.params;
            const data = { ...req.body };
            let uploadedImages = [];
            if (req.files && req.files.length > 0) {
                const { listResult } = await cloudinaryServices.uploadFiles(req.files);
                uploadedImages = listResult.map((result) => result.secure_url);
            }
            if (uploadedImages.length > 0) {
                data.imageUrl = uploadedImages;
            }
            const updatedProduct = await productService.updateProduct(id, data);
            if (!updatedProduct) {
                return res.status(400).json({
                    success: false,
                    message: "Update product failed",
                });
            }
            res.status(200).json({
                success: true,
                message: "Update product successfully",
                product: updatedProduct,
            });
        } catch (error) {
            console.error("Error updateProduct:", error.stack || error.message);
            res.status(500).json({
                success: false,
                message: "Update product failed",
                error: error.message,
            });
        }
    },

    deleteProduct: async (req, res) => {
        try {
            await productService.deleteProduct(req.params.id);
            res.status(200).json({
                success: true,
                message: "Delete product successfully",
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    },

    getProductsOfBrand: async (req, res) => {
        try {
            const brand = await brandService.getBrandByName(req.query.brandName);
            const limit = Number.parseInt(req.query.limit);
            const products = await productService.getProductsOfBrand(brand._id, limit);
            res.status(200).json({
                success: true,
                products
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    },

    countTotalProducts: async (req, res) => {
        try {
            const totalProducts = await productService.countTotalProducts();
            res.status(200).json({
                success: true,
                data: totalProducts
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    },

    compareProducts: async (req, res) => {
        try {
            const { productIds } = req.body;

            // Kiểm tra nếu không có ID hoặc số lượng ID không hợp lệ
            if (!productIds || !Array.isArray(productIds) || productIds.length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Cần ít nhất 2 sản phẩm để so sánh'
                });
            }

            // Giới hạn số lượng sản phẩm so sánh (tối đa 4)
            const limitedIds = productIds.slice(0, 4);

            // Lấy thông tin chi tiết của sản phẩm
            const products = await productService.getProductsByIds(limitedIds);

            // Lấy thông tin chi tiết kỹ thuật của sản phẩm
            const productDetails = await productService.getProductDetails(limitedIds);

            // Kết hợp thông tin sản phẩm và chi tiết kỹ thuật
            const combinedData = products.map(product => {
                const details = productDetails.find(detail => detail.product._id.toString() === product._id.toString());
                return {
                    ...product.toObject(),
                    details: details || null
                };
            });

            res.status(200).json({
                success: true,
                data: combinedData
            });
        } catch (error) {
            console.error('Error comparing products:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi so sánh sản phẩm',
                error: error.message
            });
        }
    }
};

export default productController;