import brandService from "../services/brand.service.js";
import cloudinaryServices from "../services/cloudinary.service.js";

const brandController = {
    createBrand: async (req, res) => {
        try {
            let logoUrl = null;
            if (req.file) {
                logoUrl = await cloudinaryServices.uploadFile(req.file);
            }
            const brandData = { ...req.body, logoUrl };
            const newBrand = await brandService.createBrand(brandData);
            res.status(201).json({
                message: "Create brand successfully",
                data: newBrand
            });
        } catch (error) {
            res.status(400).json({
                message: error.message
            });
        }
    },

    getAllBrands: async (req, res) => {
        try {
            const brands = await brandService.getAllBrands();
            res.status(200).json(brands);
        } catch (error) {
            res.status(400).json({
                message: error.message
            });
        }
    },

    getBrandById: async (req, res) => {
        try {
            const brandId = req.params.id;
            const brand = await brandService.getBrandById(brandId);
            res.status(200).json({
                message: "Get brand successfully",
                data: brand
            });
        } catch (error) {
            res.status(400).json({
                message: error.message
            });
        }
    },

    getBrandByName: async (req, res) => {
        try {
            const brandName = req.params.name;
            const brand = await brandService.getBrandByName(brandName);
            res.status(200).json({
                message: "Get brand by name successfully",
                data: brand
            });
        } catch (error) {
            res.status(400).json({
                message: error.message
            });
        }
    },

    updateBrand: async (req, res) => {
        try {
            const brandId = req.params.id;
            const data = req.body;
            if (req.file) {
                data.logoUrl = await cloudinaryServices.uploadFile(req.file);
            }
            const updatedBrand = await brandService.updateBrand(brandId, data);
            res.status(200).json({
                message: "Update brand successfully",
                data: updatedBrand
            });
        } catch (error) {
            res.status(400).json({
                message: error.message
            });
        }
    },

    deleteBrand: async (req, res) => {
        try {
            const brandId = req.params.id;
            await brandService.deleteBrand(brandId);
            res.status(200).json({
                message: "Delete brand successfully"
            });
        } catch (error) {
            res.status(400).json({
                message: error.message
            });
        }
    },

    getBrandsWithProductCount: async (req, res) => {
        try {
            const brandsWithCount = await brandService.getAllBrandsWithProductCount();
            res.status(200).json({
                success: true,
                data: brandsWithCount
            });
        } catch (error) {
            res.status(400).json({
                message: error.message
            });
        }
    }
};

export default brandController;