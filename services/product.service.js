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

    getAllProducts: async (searchQuery, sortOrder, selectedBrands, page, pageSize, priceRange, battery, frontCamera, backCamera, storage, ram, os) => {
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
            let detailsQuery = {};

            if (battery || frontCamera || backCamera || storage || ram || os) {
                // Xử lý lọc pin theo khoảng
                if (battery && Array.isArray(battery) && battery.length > 0) {

                    const batteryRange = battery[0].split('-');
                    const minBattery = parseInt(batteryRange[0]);
                    const maxBattery = batteryRange[1] ? parseInt(batteryRange[1]) : null;

                    const allDetails = await ProductDetails.find({}, "pinAdapter.pinCapacity product");
                    const matchedProductIds = [];

                    allDetails.forEach(detail => {
                        if (detail.pinAdapter && detail.pinAdapter.pinCapacity) {
                            const pinCapacityStr = detail.pinAdapter.pinCapacity;
                            const pinCapacityMatch = pinCapacityStr.match(/(\d+)/);

                            if (pinCapacityMatch) {
                                const pinCapacity = parseInt(pinCapacityMatch[0]);

                                if (maxBattery) {
                                    if (pinCapacity >= minBattery && pinCapacity <= maxBattery) {
                                        matchedProductIds.push(detail.product);
                                    }
                                } else if (minBattery === 0) {
                                    if (pinCapacity <= maxBattery) {
                                        matchedProductIds.push(detail.product);
                                    }
                                } else {
                                    if (pinCapacity >= minBattery) {
                                        matchedProductIds.push(detail.product);
                                    }
                                }
                            }
                        }
                    });

                    if (matchedProductIds.length > 0) {
                        if (!query._conditions._id) {
                            query.find({ _id: { $in: matchedProductIds } });
                        } else {
                            const existingIds = query._conditions._id.$in || [];
                            const combinedIds = existingIds.filter(id =>
                                matchedProductIds.some(matchedId => matchedId.toString() === id.toString())
                            );
                            query.find({ _id: { $in: combinedIds } });
                        }
                    } else {
                        query.find({ _id: { $in: [] } });
                    }
                }

                // Xử lý lọc camera trước theo khoảng
                if (frontCamera && Array.isArray(frontCamera) && frontCamera.length > 0) {
                    const cameraRange = frontCamera[0].split('-');
                    const minCamera = parseInt(cameraRange[0]);
                    const maxCamera = cameraRange[1] ? parseInt(cameraRange[1]) : null;

                    const allDetails = await ProductDetails.find({}, "cameraDisplay.frontCamera product");
                    const matchedProductIds = [];

                    allDetails.forEach(detail => {
                        let hasMatchingCamera = false;

                        const checkCameraString = (cameraStr) => {
                            if (!cameraStr) return false;

                            const mpValues = [];
                            const regex = /(\d+)\s*(?:MP|megapixel)/gi;
                            let match;
                            while ((match = regex.exec(cameraStr)) !== null) {
                                mpValues.push(parseInt(match[1]));
                            }

                            if (mpValues.length === 0) return false;

                            const maxMpValue = Math.max(...mpValues);

                            if (maxCamera) {
                                return maxMpValue >= minCamera && maxMpValue < maxCamera;
                            } else if (minCamera === 0) {
                                return maxMpValue < maxCamera;
                            } else {
                                return maxMpValue >= minCamera;
                            }
                        };

                        if (detail.cameraDisplay && detail.cameraDisplay.frontCamera) {
                            if (checkCameraString(detail.cameraDisplay.frontCamera)) {
                                hasMatchingCamera = true;
                            }
                        }

                        if (hasMatchingCamera) {
                            matchedProductIds.push(detail.product);
                        }
                    });

                    if (matchedProductIds.length > 0) {
                        if (!query._conditions._id) {
                            query.find({ _id: { $in: matchedProductIds } });
                        } else {
                            const existingIds = query._conditions._id.$in || [];
                            const combinedIds = existingIds.filter(id =>
                                matchedProductIds.some(matchedId => matchedId.toString() === id.toString())
                            );
                            query.find({ _id: { $in: combinedIds } });
                        }
                    } else {
                        query.find({ _id: { $in: [] } });
                    }
                }

                // Xử lý lọc camera sau theo khoảng
                if (backCamera && Array.isArray(backCamera) && backCamera.length > 0) {
                    const cameraRange = backCamera[0].split('-');
                    const minCamera = parseInt(cameraRange[0]);
                    const maxCamera = cameraRange[1] ? parseInt(cameraRange[1]) : null;

                    const allDetails = await ProductDetails.find({}, "cameraDisplay.backCamera product");
                    const matchedProductIds = [];

                    allDetails.forEach(detail => {
                        let hasMatchingCamera = false;

                        const checkCameraString = (cameraStr) => {
                            if (!cameraStr) return false;

                            const mpValues = [];
                            const regex = /(\d+)\s*(?:MP|megapixel)/gi;
                            let match;
                            while ((match = regex.exec(cameraStr)) !== null) {
                                mpValues.push(parseInt(match[1]));
                            }

                            if (mpValues.length === 0) return false;

                            const maxMpValue = Math.max(...mpValues);

                            if (maxCamera) {
                                return maxMpValue >= minCamera && maxMpValue < maxCamera;
                            } else if (minCamera === 0) {
                                return maxMpValue < maxCamera;
                            } else {
                                return maxMpValue >= minCamera;
                            }
                        };

                        if (detail.cameraDisplay && detail.cameraDisplay.backCamera) {
                            if (checkCameraString(detail.cameraDisplay.backCamera)) {
                                hasMatchingCamera = true;
                            }
                        }

                        if (hasMatchingCamera) {
                            matchedProductIds.push(detail.product);
                        }
                    });

                    if (matchedProductIds.length > 0) {
                        if (!query._conditions._id) {
                            query.find({ _id: { $in: matchedProductIds } });
                        } else {
                            const existingIds = query._conditions._id.$in || [];
                            const combinedIds = existingIds.filter(id =>
                                matchedProductIds.some(matchedId => matchedId.toString() === id.toString())
                            );
                            query.find({ _id: { $in: combinedIds } });
                        }
                    } else {
                        query.find({ _id: { $in: [] } });
                    }
                }

                // Bộ lọc khác
                let hasOtherFilters = false;

                if (storage && Array.isArray(storage) && storage.length > 0) {
                    detailsQuery["specifications.storage"] = { $in: storage };
                    hasOtherFilters = true;
                }

                if (ram && Array.isArray(ram) && ram.length > 0) {
                    detailsQuery["specifications.ram"] = { $in: ram };
                    hasOtherFilters = true;
                }

                if (os && Array.isArray(os) && os.length > 0) {
                    detailsQuery["specifications.os"] = { $in: os.map(item => new RegExp(item, 'i')) };
                    hasOtherFilters = true;
                }

                if (hasOtherFilters) {
                    const productDetails = await ProductDetails.find(detailsQuery);
                    const productIds = productDetails.map(detail => detail.product);

                    if (productIds.length > 0) {
                        if (!query._conditions._id) {
                            query.find({ _id: { $in: productIds } });
                        } else {
                            const existingIds = query._conditions._id.$in || [];
                            const combinedIds = existingIds.filter(id =>
                                productIds.some(matchedId => matchedId.toString() === id.toString())
                            );
                            query.find({ _id: { $in: combinedIds } });
                        }
                    } else if (hasOtherFilters) {
                        query.find({ _id: { $in: [] } });
                    }
                }
            }

            if (searchQuery) {
                query.find({ name: { $regex: searchQuery, $options: "i" } });
            }

            if (selectedBrands && selectedBrands.length > 0) {
                const brands = await Brand.find({ name: { $in: selectedBrands } });
                const brandIds = brands.map(brand => brand._id);

                query.find({ brand: { $in: brandIds } });
            }

            // lọc theo khoảng giá
            if (priceRange) {
                const [minPrice, maxPrice] = priceRange.split('-').map(price => parseInt(price));
                if (!isNaN(minPrice) && !isNaN(maxPrice)) {
                    query.find({ price: { $gte: minPrice, $lte: maxPrice } });
                }
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
            const minPrice = Math.max(0, targetPrice - range);
            const maxPrice = targetPrice + range;

            const now = new Date();
            const flashSales = await FlashSale.find({
                isActive: true,
                startTime: { $lte: now },
                endTime: { $gte: now }
            });

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

            const allProducts = await Product.find().populate('brand');

            const productsWithPrices = allProducts.map(product => {
                const productId = product._id.toString();
                const productObj = product.toObject();

                if (flashSaleMap[productId]) {
                    const flashSalePrice = flashSaleMap[productId].discountPrice;
                    return {
                        ...productObj,
                        originalPrice: productObj.price,
                        displayPrice: flashSalePrice,
                        price: flashSalePrice,
                        isFlashSale: true,
                        isOnSale: true,
                        discountPercent: Math.round((1 - flashSalePrice / productObj.price) * 100)
                    };
                }

                return {
                    ...productObj,
                    displayPrice: productObj.price
                };
            });

            const productsInRange = productsWithPrices.filter(product =>
                product.displayPrice >= minPrice && product.displayPrice <= maxPrice
            );

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
            const productDetails = await ProductDetails.find({
                $or: [
                    { "cameraDisplay.frontCamera": { $regex: cameraSpec, $options: 'i' } },
                    { "cameraDisplay.backCamera": { $regex: cameraSpec, $options: 'i' } }
                ]
            })
                .populate('product')
                .limit(limit);

            const productIds = productDetails.map(detail => detail.product._id);

            const products = await Product.find({ _id: { $in: productIds } })
                .populate('brand');

            return products;
        } catch (error) {
            console.error('Error finding products by camera:', error);
            throw new Error('Không thể tìm sản phẩm theo thông số camera');
        }
    },

    findProductsByBatteryCapacity: async (batteryCapacity, limit = 4) => {
        try {
            const productDetails = await ProductDetails.find({
                "pinAdapter.pinCapacity": { $regex: batteryCapacity, $options: 'i' }
            })
                .populate('product')
                .limit(limit);

            const productIds = productDetails.map(detail => detail.product._id);

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
            const nameParts = productName.split(' ');
            let seriesName = '';

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
            const productDetails = await ProductDetails.find({
                "specifications.storage": { $regex: storage, $options: 'i' }
            })
                .populate('product')
                .limit(limit);

            const productIds = productDetails.map(detail => detail.product._id);

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
            const frontCameras = await ProductDetails.distinct("cameraDisplay.frontCamera");
            const backCameras = await ProductDetails.distinct("cameraDisplay.backCamera");
            const allCameras = [...frontCameras, ...backCameras];
            return allCameras;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    getDistinctFrontCameraSpecs: async () => {
        try {
            const frontCameras = await ProductDetails.distinct("cameraDisplay.frontCamera");
            return frontCameras;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    getDistinctBackCameraSpecs: async () => {
        try {
            const backCameras = await ProductDetails.distinct("cameraDisplay.backCamera");
            return backCameras;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Lấy danh sách các dung lượng pin distinct
    getDistinctBatteryCapacities: async () => {
        try {
            const capacities = await ProductDetails.distinct('pinAdapter.pinCapacity');

            const validCapacities = capacities
                .filter(capacity => capacity && capacity.trim() !== '')
                .sort((a, b) => {
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

            const validOptions = storageOptions
                .filter(option => option && option.trim() !== '')
                .sort((a, b) => {
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
            const products = await Product.find({}, 'name');

            const seriesMap = new Map();

            products.forEach(product => {
                if (product.name) {
                    const nameParts = product.name.split(' ');
                    let seriesName = '';

                    if (nameParts.length >= 2) {
                        if (nameParts[0].toLowerCase().includes('iphone')) {
                            seriesName = `${nameParts[0]} ${nameParts[1]}`;
                        }
                        else if (nameParts[0].toLowerCase().includes('samsung') &&
                            nameParts[1].toLowerCase().includes('galaxy')) {
                            if (nameParts.length >= 3) {
                                seriesName = `${nameParts[0]} ${nameParts[1]} ${nameParts[2]}`;
                            } else {
                                seriesName = `${nameParts[0]} ${nameParts[1]}`;
                            }
                        }
                        else {
                            seriesName = `${nameParts[0]} ${nameParts[1]}`;
                        }

                        seriesMap.set(seriesName.trim(), true);
                    }
                }
            });

            const seriesList = Array.from(seriesMap.keys()).sort();

            return seriesList;
        } catch (error) {
            console.error('Error getting distinct product series:', error);
            throw new Error('Không thể lấy danh sách loại sản phẩm');
        }
    }
};

export default productService;