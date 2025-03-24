import slugify from "slugify";
import Product from "../models/product.model.js";
import Brand from "../models/brand.model.js";

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
};

export default productService;