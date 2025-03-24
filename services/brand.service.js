import Brand from '../models/brand.model.js';
import Product from '../models/product.model.js';

const brandService = {
    createBrand: async (data) => {
        try {
            const newBrand = await Brand.create(data);
            return newBrand;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    getAllBrands: async () => {
        try {
            const brands = await Brand.find();
            return brands;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    getBrandById: async (id) => {
        try {
            const brand = await Brand.findById(id);
            return brand;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    getBrandByName: async (name) => {
        try {
            const brand = await Brand.findOne({ name });
            return brand;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    updateBrand: async (id, newData) => {
        try {
            const brand = await Brand.findById(id);
            if (!brand) {
                throw new Error("Not found brand");
            }
            if (newData.logoUrl) {
                brand.logoUrl = newData.logoUrl;
            }
            else {
                newData.logoUrl = brand.logoUrl;
            }
            const updatedBrand = await Brand.findByIdAndUpdate(
                id,
                { $set: newData },
                { new: true }
            );
            return updatedBrand;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    deleteBrand: async (id) => {
        try {
            await Brand.findByIdAndDelete(id);
            return true;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    getAllBrandsWithProductCount: async () => {
        try {
            const brands = await Brand.find();
            const brandsWidthCount = [];
            for (const brand of brands) {
                const productCount = await Product.countDocuments({ brand: brand._id });
                brandsWidthCount.push({
                    ...brand.toObject(),
                    productCount
                });
            }
            return brandsWidthCount;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

export default brandService;