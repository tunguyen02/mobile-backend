import { Router } from 'express';
import cartController from '../controllers/cart.controller.js';

const CartRouter = Router();

CartRouter.get('/my-cart', cartController.getMyCart);
CartRouter.patch('/update-product', cartController.updateProduct);
CartRouter.patch('/add-product', cartController.addProductToCart);

export default CartRouter;