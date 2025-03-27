import { Router } from "express";
import productDetailController from "../controllers/productDetails.controller.js";

const ProductDetailRouter = Router();

ProductDetailRouter.post('/create', productDetailController.createProductDetail);
ProductDetailRouter.get('/:productId', productDetailController.getProductDetail);
ProductDetailRouter.patch('/update/:productId', productDetailController.updateProductDetail);
ProductDetailRouter.delete('/delete/:productId', productDetailController.deleteProductDetail);

export default ProductDetailRouter;