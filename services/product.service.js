import slugify from "slugify";
import Product from "../models/product.model.js";
import Brand from "../models/brand.model.js";
import ProductDetails from "../models/productDetails.model.js";
import FlashSale from "../models/flashSale.model.js";

export const generateSlugify = async (name) => {
    let slug = slugify(
        name,
        { lower: true, locale: 'vi', strict: true }
    );
    let slugExist = await Product.findOne({ urlSlug: slug });
    let counter = 1;
    let uniqueSlug = slug;

    while (slugExist) {
        uniqueSlug = `${slug}-${counter}`;
        slugExist = await Product.findOne({ urlSlug: uniqueSlug });
        counter++;
    }
    return uniqueSlug;
}

const productService = {
    createProduct: async (product) => {
        try {
            let slug = await generateSlugify(product.name);
            const newProduct = await Product.create({
                ...product,
                urlSlug: slug
            });
            return newProduct;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    getProductBySlug: async (slug) => {
        try {
            const product = await Product.findOne({ urlSlug: slug });
            if (!product) {
                throw new Error("Not found product");
            }
            return product;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    getProductById: async (id) => {
        try {
            const product = await Product.findById(id);
            if (!product) {
                throw new Error("Not found product");
            }
            return product;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    getAllProducts: async (searchQuery, sortOrder, selectedBrands, page, pageSize) => {
        if (page && typeof page === "string") {
            page = parseInt(page);
            if (isNaN(page) || page < 1) page = 1;
        }

        if (pageSize && typeof pageSize === "string") {
            pageSize = parseInt(pageSize);
            if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) pageSize = 10;
        }

        try {
            let query = Product.find();

            if (searchQuery) {
                query.find({ name: { $regex: searchQuery, $options: "i" } });
            }

            if (selectedBrands && selectedBrands.length > 0) {
                const brands = await Brand.find({ name: { $in: selectedBrands } });
                const brandIds = brands.map(brand => brand._id);

                query.find({ brand: { $in: brandIds } });
            }

            const totalProducts = await Product.countDocuments(query.getQuery());

            let sort = {};

            if (sortOrder) {
                if (sortOrder === "name-asc") {
                    sort = { name: 1 };
                }
                else if (sortOrder === "price-desc") {
                    sort = { price: -1 };
                }
                else if (sortOrder === "price-asc") {
                    sort = { price: 1 };
                }

                query.sort(sort);
            }

            if (page && pageSize) {
                query = query.skip((page - 1) * pageSize).limit(pageSize);
            }

            const products = await query.exec();

            return { totalProducts, products };
        } catch (error) {
            throw new Error(error.message);
        }
    },

    getProductsOfBrand: async (brandId, limit) => {
        try {
            let query = Product.find({ brand: brandId });

            if (Number.isInteger(limit) && limit > 0) {
                query = query.limit(limit);
            }

            const products = await query.exec();
            return products;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    updateProduct: async (productId, data) => {
        try {
            const product = await Product.findById(productId);
            if (!product) {
                throw new Error("Not found product");
            }

            if (data.name) {
                data.urlSlug = await generateSlugify(data.name);
            }

            if (data.imageUrl && Array.isArray(data.imageUrl)) {
                data.imageUrl = data.imageUrl.filter(item => typeof item === 'string');
            }

            if (!data.imageUrl || data.imageUrl.length === 0) {
                data.imageUrl = product.imageUrl;
            }

            const updatedProduct = await Product.findByIdAndUpdate(
                productId,
                { $set: data },
                { new: true, runValidators: true }
            );

            if (!updatedProduct) {
                throw new Error("Not found product");
            }

            return updatedProduct;
        } catch (error) {
            console.error("Error", error.stack || error.message);
            throw new Error(error.message);
        }
    },


    deleteProduct: async (id) => {
        try {
            const product = await Product.findByIdAndDelete(id);
            if (!product) {
                throw new Error("Not found product");
            }
        } catch (error) {
            throw new Error(error.message);
        }
    },

    countTotalProducts: async () => {
        try {
            const totalProducts = await Product.countDocuments();
            return totalProducts;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    getProductsByIds: async (productIds) => {
        try {
            const products = await Product.find({ _id: { $in: productIds } })
                .populate('brand');
            return products;
        } catch (error) {
            console.error('Error getting products by IDs:', error);
            throw new Error('Không thể lấy thông tin sản phẩm');
        }
    },

    getProductDetails: async (productIds) => {
        try {
            const details = await ProductDetails.find({ product: { $in: productIds } })
                .populate('product');
            return details;
        } catch (error) {
            console.error('Error getting product details:', error);
            throw new Error('Không thể lấy thông tin chi tiết sản phẩm');
        }
    },

    // Tìm sản phẩm theo khoảng giá
    findProductsByPriceRange: async (targetPrice, range = 2000000, limit = 4) => {
        try {
            // Tính khoảng giá dựa trên giá mục tiêu
            const minPrice = Math.max(0, targetPrice - range);
            const maxPrice = targetPrice + range;

            // Lấy thông tin flash sale đang hoạt động
            const now = new Date();
            const flashSales = await FlashSale.find({
                isActive: true,
                startTime: { $lte: now },
                endTime: { $gte: now }
            });

            // Tạo map sản phẩm flash sale
            const flashSaleMap = {};
            flashSales.forEach(flashSale => {
                flashSale.products.forEach(product => {
                    const productId = product.product.toString();
                    if (!flashSaleMap[productId] || flashSaleMap[productId].discountPrice > product.discountPrice) {
                        flashSaleMap[productId] = {
                            discountPrice: product.discountPrice,
                            quantity: product.quantity,
                            soldCount: product.soldCount,
                            flashSaleId: flashSale._id,
                            endTime: flashSale.endTime
                        };
                    }
                });
            });

            // Lấy tất cả sản phẩm
            const allProducts = await Product.find().populate('brand');

            // Tạo một mảng tất cả sản phẩm với giá thích hợp (giá gốc hoặc giá Flash Sale)
            const productsWithPrices = allProducts.map(product => {
                const productId = product._id.toString();
                const productObj = product.toObject();

                // Kiểm tra xem sản phẩm có trong Flash Sale không
                if (flashSaleMap[productId]) {
                    const flashSalePrice = flashSaleMap[productId].discountPrice;
                    return {
                        ...productObj,
                        originalPrice: productObj.price,
                        displayPrice: flashSalePrice, // Giá hiển thị (để so sánh)
                        price: flashSalePrice, // Cập nhật giá thực tế
                        isFlashSale: true,
                        isOnSale: true,
                        discountPercent: Math.round((1 - flashSalePrice / productObj.price) * 100)
                    };
                }

                return {
                    ...productObj,
                    displayPrice: productObj.price // Sử dụng giá gốc cho sản phẩm không trong Flash Sale
                };
            });

            // Lọc các sản phẩm trong khoảng giá theo giá hiển thị
            const productsInRange = productsWithPrices.filter(product =>
                product.displayPrice >= minPrice && product.displayPrice <= maxPrice
            );

            // Sắp xếp theo sự gần gũi với giá mục tiêu
            const sortedProducts = productsInRange.sort((a, b) => {
                const distanceA = Math.abs(a.displayPrice - targetPrice);
                const distanceB = Math.abs(b.displayPrice - targetPrice);
                return distanceA - distanceB;
            }).slice(0, limit);

            return sortedProducts;
        } catch (error) {
            console.error('Error finding products by price range:', error);
            throw new Error('Không thể tìm sản phẩm theo khoảng giá');
        }
    },

    // Tìm sản phẩm theo camera
    findProductsByCamera: async (cameraSpec, limit = 4) => {
        try {
            // Tìm thông tin chi tiết sản phẩm có thông số camera tương tự
            const productDetails = await ProductDetails.find({
                $or: [
                    { "cameraDisplay.frontCamera": { $regex: cameraSpec, $options: 'i' } },
                    { "cameraDisplay.backCamera": { $regex: cameraSpec, $options: 'i' } }
                ]
            })
                .populate('product')
                .limit(limit);

            // Lấy ID sản phẩm từ chi tiết sản phẩm
            const productIds = productDetails.map(detail => detail.product._id);

            // Lấy thông tin đầy đủ của sản phẩm
            const products = await Product.find({ _id: { $in: productIds } })
                .populate('brand');

            return products;
        } catch (error) {
            console.error('Error finding products by camera:', error);
            throw new Error('Không thể tìm sản phẩm theo thông số camera');
        }
    },

    // Tìm sản phẩm theo dung lượng pin
    findProductsByBatteryCapacity: async (batteryCapacity, limit = 4) => {
        try {
            // Tìm thông tin chi tiết sản phẩm có dung lượng pin tương tự
            const productDetails = await ProductDetails.find({
                "pinAdapter.pinCapacity": { $regex: batteryCapacity, $options: 'i' }
            })
                .populate('product')
                .limit(limit);

            // Lấy ID sản phẩm từ chi tiết sản phẩm
            const productIds = productDetails.map(detail => detail.product._id);

            // Lấy thông tin đầy đủ của sản phẩm
            const products = await Product.find({ _id: { $in: productIds } })
                .populate('brand');

            return products;
        } catch (error) {
            console.error('Error finding products by battery capacity:', error);
            throw new Error('Không thể tìm sản phẩm theo dung lượng pin');
        }
    },

    // Tìm sản phẩm cùng loại
    findProductsBySeries: async (productName, limit = 4) => {
        try {
            // Tìm sản phẩm có tên tương tự (cùng series)
            // Ví dụ: iPhone 12, iPhone 13, Samsung Galaxy S21, etc.
            const nameParts = productName.split(' ');
            let seriesName = '';

            // Cố gắng tìm tên series từ tên sản phẩm
            // Ví dụ: "iPhone 12 Pro Max" -> "iPhone 12"
            if (nameParts.length >= 2) {
                seriesName = `${nameParts[0]} ${nameParts[1]}`;
            } else {
                seriesName = productName;
            }

            const products = await Product.find({
                name: { $regex: seriesName, $options: 'i' }
            })
                .limit(limit)
                .populate('brand');

            return products;
        } catch (error) {
            console.error('Error finding products by series:', error);
            throw new Error('Không thể tìm sản phẩm cùng loại');
        }
    },

    // Tìm sản phẩm theo dung lượng bộ nhớ
    findProductsByStorage: async (storage, limit = 4) => {
        try {
            // Tìm thông tin chi tiết sản phẩm có dung lượng bộ nhớ tương tự
            const productDetails = await ProductDetails.find({
                "specifications.storage": { $regex: storage, $options: 'i' }
            })
                .populate('product')
                .limit(limit);

            // Lấy ID sản phẩm từ chi tiết sản phẩm
            const productIds = productDetails.map(detail => detail.product._id);

            // Lấy thông tin đầy đủ của sản phẩm
            const products = await Product.find({ _id: { $in: productIds } })
                .populate('brand');

            return products;
        } catch (error) {
            console.error('Error finding products by storage:', error);
            throw new Error('Không thể tìm sản phẩm theo dung lượng bộ nhớ');
        }
    },

    // Lấy danh sách các thông số camera distinct
    getDistinctCameraSpecs: async () => {
        try {
            // Lấy danh sách camera trước và camera sau
            const frontCameras = await ProductDetails.distinct('cameraDisplay.frontCamera');
            const backCameras = await ProductDetails.distinct('cameraDisplay.backCamera');

            // Kết hợp và loại bỏ các giá trị null hoặc rỗng
            const allCameras = [...frontCameras, ...backCameras]
                .filter(camera => camera && camera.trim() !== '')
                .sort();

            // Loại bỏ các giá trị trùng lặp
            const uniqueCameras = [...new Set(allCameras)];

            return uniqueCameras;
        } catch (error) {
            console.error('Error getting distinct camera specs:', error);
            throw new Error('Không thể lấy danh sách thông số camera');
        }
    },

    // Lấy danh sách các dung lượng pin distinct
    getDistinctBatteryCapacities: async () => {
        try {
            const capacities = await ProductDetails.distinct('pinAdapter.pinCapacity');

            // Lọc và sắp xếp các giá trị hợp lệ
            const validCapacities = capacities
                .filter(capacity => capacity && capacity.trim() !== '')
                .sort((a, b) => {
                    // Trích xuất số từ chuỗi (ví dụ: "5000mAh" -> 5000)
                    const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
                    const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
                    return numA - numB;
                });

            return validCapacities;
        } catch (error) {
            console.error('Error getting distinct battery capacities:', error);
            throw new Error('Không thể lấy danh sách dung lượng pin');
        }
    },

    // Lấy danh sách các dung lượng bộ nhớ distinct
    getDistinctStorageOptions: async () => {
        try {
            const storageOptions = await ProductDetails.distinct('specifications.storage');

            // Lọc và sắp xếp các giá trị hợp lệ
            const validOptions = storageOptions
                .filter(option => option && option.trim() !== '')
                .sort((a, b) => {
                    // Trích xuất số từ chuỗi (ví dụ: "128GB" -> 128)
                    const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
                    const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
                    return numA - numB;
                });

            return validOptions;
        } catch (error) {
            console.error('Error getting distinct storage options:', error);
            throw new Error('Không thể lấy danh sách dung lượng bộ nhớ');
        }
    },

    // Lấy danh sách các series sản phẩm distinct
    getDistinctProductSeries: async () => {
        try {
            // Lấy tất cả sản phẩm
            const products = await Product.find({}, 'name');

            // Xử lý tên sản phẩm để trích xuất series
            const seriesMap = new Map();

            products.forEach(product => {
                if (product.name) {
                    // Phân tích tên sản phẩm để lấy series
                    // Ví dụ: "iPhone 12 Pro Max" -> "iPhone 12"
                    const nameParts = product.name.split(' ');
                    let seriesName = '';

                    if (nameParts.length >= 2) {
                        // Xử lý cho iPhone
                        if (nameParts[0].toLowerCase().includes('iphone')) {
                            seriesName = `${nameParts[0]} ${nameParts[1]}`;
                        }
                        // Xử lý cho Samsung Galaxy
                        else if (nameParts[0].toLowerCase().includes('samsung') &&
                            nameParts[1].toLowerCase().includes('galaxy')) {
                            if (nameParts.length >= 3) {
                                seriesName = `${nameParts[0]} ${nameParts[1]} ${nameParts[2]}`;
                            } else {
                                seriesName = `${nameParts[0]} ${nameParts[1]}`;
                            }
                        }
                        // Xử lý cho các hãng khác
                        else {
                            seriesName = `${nameParts[0]} ${nameParts[1]}`;
                        }

                        seriesMap.set(seriesName.trim(), true);
                    }
                }
            });

            // Chuyển đổi Map thành mảng và sắp xếp
            const seriesList = Array.from(seriesMap.keys()).sort();

            return seriesList;
        } catch (error) {
            console.error('Error getting distinct product series:', error);
            throw new Error('Không thể lấy danh sách loại sản phẩm');
        }
    }
};

export default productService;