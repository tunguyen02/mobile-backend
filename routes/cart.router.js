import { Router } from 'express';
import cartController from '../controllers/cart.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const CartRouter = Router();

CartRouter.get('/my-cart', authMiddleware.protect, cartController.getMyCart);
CartRouter.patch('/update-product', authMiddleware.protect, cartController.updateProduct);
CartRouter.patch('/add-product', authMiddleware.protect, cartController.addProductToCart);

export default CartRouter;