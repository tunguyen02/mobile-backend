import { Router } from "express";
import productController from "../controllers/product.controller.js";
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const ProductRouter = Router();

ProductRouter.get('/', productController.getAllProducts);
ProductRouter.post('/create', upload.array('imageUrl', 6), productController.createProduct);
ProductRouter.get('/product-details/:id', productController.getProductById);
ProductRouter.get('/details/:slug', productController.getProductBySlug);
ProductRouter.get('/get-all', productController.getAllProducts);
ProductRouter.get('/total-products', productController.countTotalProducts);
ProductRouter.patch('/update/:id', upload.array('imageUrl', 6), productController.updateProduct);
ProductRouter.delete('/delete/:id', productController.deleteProduct);
ProductRouter.get('/products-of-brand', productController.getProductsOfBrand);

export default ProductRouter;