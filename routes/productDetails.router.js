import { Router } from "express";
import productDetailController from "../controllers/productDetails.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const ProductDetailRouter = Router();

ProductDetailRouter.get('/:productId', productDetailController.getProductDetail);
ProductDetailRouter.post('/create', authMiddleware.protect, productDetailController.createProductDetail);
ProductDetailRouter.patch('/update/:productId', authMiddleware.protect, productDetailController.updateProductDetail);
ProductDetailRouter.delete('/delete/:productId', authMiddleware.protect, productDetailController.deleteProductDetail);

export default ProductDetailRouter;