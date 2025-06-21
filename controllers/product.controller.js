import brandService from "../services/brand.service.js";
import productService from "../services/product.service.js";
import cloudinaryServices from "../services/cloudinary.service.js";
import FlashSale from "../models/flashSale.model.js";

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
            const {
                searchQuery,
                sortOrder,
                selectedBrands,
                page,
                pageSize,
                priceRange,
                battery,
                frontCamera,
                backCamera,
                storage,
                ram,
                os
            } = req.query;

            console.log("Query params:", req.query);
            console.log("Selected brands:", selectedBrands);

            const { products, totalProducts } = await productService.getAllProducts(
                searchQuery,
                sortOrder,
                selectedBrands,
                page,
                pageSize,
                priceRange,
                battery,
                frontCamera,
                backCamera,
                storage,
                ram,
                os
            );

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

            if (!productIds || !Array.isArray(productIds) || productIds.length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Cần ít nhất 2 sản phẩm để so sánh'
                });
            }

            const limitedIds = productIds.slice(0, 4);

            const products = await productService.getProductsByIds(limitedIds);

            const productDetails = await productService.getProductDetails(limitedIds);

            const now = new Date();
            const activeFlashSales = await FlashSale.find({
                isActive: true,
                startTime: { $lte: now },
                endTime: { $gte: now }
            });

            const flashSaleProductsMap = {};

            activeFlashSales.forEach(flashSale => {
                flashSale.products.forEach(product => {
                    const productId = product.product.toString();
                    if (!flashSaleProductsMap[productId] ||
                        flashSaleProductsMap[productId].discountPrice > product.discountPrice) {
                        flashSaleProductsMap[productId] = {
                            isFlashSale: true,
                            flashSaleId: flashSale._id,
                            discountPrice: product.discountPrice,
                            originalPrice: null,
                            discountPercent: 0,
                            quantity: product.quantity,
                            soldCount: product.soldCount,
                            endTime: flashSale.endTime
                        };
                    }
                });
            });

            const combinedData = products.map(product => {
                const details = productDetails.find(detail => detail.product._id.toString() === product._id.toString());
                const productObj = product.toObject();

                // Thêm thông tin flash sale nếu sản phẩm đang trong flash sale
                const flashSaleInfo = flashSaleProductsMap[product._id.toString()];
                if (flashSaleInfo) {
                    // Cập nhật thông tin flash sale
                    flashSaleInfo.originalPrice = productObj.price;
                    flashSaleInfo.discountPercent = Math.round((1 - flashSaleInfo.discountPrice / productObj.price) * 100);

                    // Thêm thông tin vào đối tượng sản phẩm
                    productObj.isFlashSale = true;
                    productObj.isOnSale = true;
                    productObj.discountPercent = flashSaleInfo.discountPercent;
                    productObj.originalPrice = productObj.price;
                    productObj.price = flashSaleInfo.discountPrice;
                }

                return {
                    ...productObj,
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
    },

    // Tìm sản phẩm theo khoảng giá
    findProductsByPrice: async (req, res) => {
        try {
            const { targetPrice, range, limit } = req.query;

            if (!targetPrice) {
                return res.status(400).json({
                    success: false,
                    message: 'Cần cung cấp giá mục tiêu'
                });
            }

            const parsedPrice = parseInt(targetPrice);
            const parsedRange = range ? parseInt(range) : 2000000;
            const parsedLimit = limit ? parseInt(limit) : 4;

            if (isNaN(parsedPrice)) {
                return res.status(400).json({
                    success: false,
                    message: 'Giá mục tiêu không hợp lệ'
                });
            }

            const products = await productService.findProductsByPriceRange(parsedPrice, parsedRange, parsedLimit);

            const productIds = products.map(product => product._id);
            const productDetails = await productService.getProductDetails(productIds);

            // Kết hợp thông tin sản phẩm và chi tiết kỹ thuật
            const combinedData = products.map(product => {
                const details = productDetails.find(detail => detail.product && detail.product._id.toString() === product._id.toString());
                // Đảm bảo rằng thông tin sản phẩm đã bao gồm thông tin flash sale nếu có
                return {
                    ...product,
                    details: details || null
                };
            });

            res.status(200).json({
                success: true,
                data: combinedData
            });
        } catch (error) {
            console.error('Error finding products by price:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi tìm sản phẩm theo giá',
                error: error.message
            });
        }
    },

    // Tìm sản phẩm theo camera
    findProductsByCamera: async (req, res) => {
        try {
            const { cameraSpec, limit } = req.query;

            if (!cameraSpec) {
                return res.status(400).json({
                    success: false,
                    message: 'Cần cung cấp thông số camera'
                });
            }

            const parsedLimit = limit ? parseInt(limit) : 4;

            const products = await productService.findProductsByCamera(cameraSpec, parsedLimit);

            // Lấy thông tin chi tiết kỹ thuật của sản phẩm
            const productIds = products.map(product => product._id);
            const productDetails = await productService.getProductDetails(productIds);

            // Kết hợp thông tin sản phẩm và chi tiết kỹ thuật
            const combinedData = products.map(product => {
                const details = productDetails.find(detail => detail.product && detail.product._id.toString() === product._id.toString());
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
            console.error('Error finding products by camera:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi tìm sản phẩm theo camera',
                error: error.message
            });
        }
    },

    // Tìm sản phẩm theo pin
    findProductsByBattery: async (req, res) => {
        try {
            const { batteryCapacity, limit } = req.query;

            if (!batteryCapacity) {
                return res.status(400).json({
                    success: false,
                    message: 'Cần cung cấp dung lượng pin'
                });
            }

            const parsedLimit = limit ? parseInt(limit) : 4;

            const products = await productService.findProductsByBatteryCapacity(batteryCapacity, parsedLimit);

            // Lấy thông tin chi tiết kỹ thuật của sản phẩm
            const productIds = products.map(product => product._id);
            const productDetails = await productService.getProductDetails(productIds);

            // Kết hợp thông tin sản phẩm và chi tiết kỹ thuật
            const combinedData = products.map(product => {
                const details = productDetails.find(detail => detail.product && detail.product._id.toString() === product._id.toString());
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
            console.error('Error finding products by battery:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi tìm sản phẩm theo pin',
                error: error.message
            });
        }
    },

    // Tìm sản phẩm cùng loại
    findProductsBySeries: async (req, res) => {
        try {
            const { productName, limit } = req.query;

            if (!productName) {
                return res.status(400).json({
                    success: false,
                    message: 'Cần cung cấp tên sản phẩm'
                });
            }

            const parsedLimit = limit ? parseInt(limit) : 4;

            const products = await productService.findProductsBySeries(productName, parsedLimit);

            // Lấy thông tin chi tiết kỹ thuật của sản phẩm
            const productIds = products.map(product => product._id);
            const productDetails = await productService.getProductDetails(productIds);

            // Kết hợp thông tin sản phẩm và chi tiết kỹ thuật
            const combinedData = products.map(product => {
                const details = productDetails.find(detail => detail.product && detail.product._id.toString() === product._id.toString());
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
            console.error('Error finding products by series:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi tìm sản phẩm cùng loại',
                error: error.message
            });
        }
    },

    // Tìm sản phẩm theo dung lượng
    findProductsByStorage: async (req, res) => {
        try {
            const { storage, limit } = req.query;

            if (!storage) {
                return res.status(400).json({
                    success: false,
                    message: 'Cần cung cấp dung lượng bộ nhớ'
                });
            }

            const parsedLimit = limit ? parseInt(limit) : 4;

            const products = await productService.findProductsByStorage(storage, parsedLimit);

            // Lấy thông tin chi tiết kỹ thuật của sản phẩm
            const productIds = products.map(product => product._id);
            const productDetails = await productService.getProductDetails(productIds);

            // Kết hợp thông tin sản phẩm và chi tiết kỹ thuật
            const combinedData = products.map(product => {
                const details = productDetails.find(detail => detail.product && detail.product._id.toString() === product._id.toString());
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
            console.error('Error finding products by storage:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi tìm sản phẩm theo dung lượng',
                error: error.message
            });
        }
    },

    // Lấy danh sách các thông số camera distinct
    getDistinctCameraSpecs: async (req, res) => {
        try {
            const cameraSpecs = await productService.getDistinctCameraSpecs();
            res.status(200).json({
                success: true,
                data: cameraSpecs
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    },

    getDistinctFrontCameraSpecs: async (req, res) => {
        try {
            const frontCameraSpecs = await productService.getDistinctFrontCameraSpecs();
            res.status(200).json({
                success: true,
                data: frontCameraSpecs
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    },

    getDistinctBackCameraSpecs: async (req, res) => {
        try {
            const backCameraSpecs = await productService.getDistinctBackCameraSpecs();
            res.status(200).json({
                success: true,
                data: backCameraSpecs
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    },

    // Lấy danh sách các dung lượng pin distinct
    getDistinctBatteryCapacities: async (req, res) => {
        try {
            const batteryCapacities = await productService.getDistinctBatteryCapacities();

            res.status(200).json({
                success: true,
                data: batteryCapacities
            });
        } catch (error) {
            console.error('Error getting distinct battery capacities:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy danh sách dung lượng pin',
                error: error.message
            });
        }
    },

    // Lấy danh sách các dung lượng bộ nhớ distinct
    getDistinctStorageOptions: async (req, res) => {
        try {
            const storageOptions = await productService.getDistinctStorageOptions();

            res.status(200).json({
                success: true,
                data: storageOptions
            });
        } catch (error) {
            console.error('Error getting distinct storage options:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy danh sách dung lượng bộ nhớ',
                error: error.message
            });
        }
    },

    // Lấy danh sách các series sản phẩm distinct
    getDistinctProductSeries: async (req, res) => {
        try {
            const productSeries = await productService.getDistinctProductSeries();

            res.status(200).json({
                success: true,
                data: productSeries
            });
        } catch (error) {
            console.error('Error getting distinct product series:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy danh sách loại sản phẩm',
                error: error.message
            });
        }
    }
};

export default productController;