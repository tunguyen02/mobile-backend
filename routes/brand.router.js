import { Router } from "express";
import brandController from "../controllers/brand.controller.js";
import multer from 'multer';
import authMiddleware from "../middlewares/auth.middleware.js";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const BrandRouter = Router();

BrandRouter.get('/get-all', brandController.getAllBrands);
BrandRouter.get('/brand-by-name/:name', brandController.getBrandByName);
BrandRouter.get('/details/:id', brandController.getBrandById);
BrandRouter.get('/brands-with-count', brandController.getBrandsWithProductCount);

BrandRouter.post('/create', authMiddleware.protect, upload.single('logoUrl'), brandController.createBrand);
BrandRouter.put('/update/:id', authMiddleware.protect, upload.single('logoUrl'), brandController.updateBrand);
BrandRouter.delete('/delete/:id', authMiddleware.protect, brandController.deleteBrand);

export default BrandRouter;