import { Router } from "express";
import productController from "../controllers/product.controller.js";
import multer from 'multer';
import authMiddleware from "../middlewares/auth.middleware.js";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const ProductRouter = Router();

// Route cho so sánh sản phẩm
ProductRouter.post('/compare', productController.compareProducts);

// Routes cho tìm sản phẩm theo tiêu chí
ProductRouter.get('/find-by-price', productController.findProductsByPrice);
ProductRouter.get('/find-by-camera', productController.findProductsByCamera);
ProductRouter.get('/find-by-battery', productController.findProductsByBattery);
ProductRouter.get('/find-by-series', productController.findProductsBySeries);
ProductRouter.get('/find-by-storage', productController.findProductsByStorage);

// Routes cho lấy danh sách các giá trị distinct
ProductRouter.get('/distinct-camera-specs', productController.getDistinctCameraSpecs);
ProductRouter.get('/distinct-battery-capacities', productController.getDistinctBatteryCapacities);
ProductRouter.get('/distinct-storage-options', productController.getDistinctStorageOptions);
ProductRouter.get('/distinct-product-series', productController.getDistinctProductSeries);

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