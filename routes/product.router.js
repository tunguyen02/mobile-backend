import { Router } from "express";
import productController from "../controllers/product.controller.js";
import multer from 'multer';
import authMiddleware from "../middlewares/auth.middleware.js";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const ProductRouter = Router();

// Route cho so sánh sản phẩm
ProductRouter.post('/compare', productController.compareProducts);

ProductRouter.get('/', productController.getAllProducts);
ProductRouter.get('/product-details/:id', productController.getProductById);
ProductRouter.get('/details/:slug', productController.getProductBySlug);
ProductRouter.get('/get-all', productController.getAllProducts);
ProductRouter.get('/total-products', productController.countTotalProducts);
ProductRouter.get('/products-of-brand', productController.getProductsOfBrand);

ProductRouter.post('/create', authMiddleware.protect, upload.array('imageUrl', 6), productController.createProduct);
ProductRouter.patch('/update/:id', authMiddleware.protect, upload.array('imageUrl', 6), productController.updateProduct);
ProductRouter.delete('/delete/:id', authMiddleware.protect, productController.deleteProduct);

export default ProductRouter;