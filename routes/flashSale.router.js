import { Router } from "express";
import flashSaleController from "../controllers/flashSale.controller.js";

const FlashSaleRouter = Router();

FlashSaleRouter.post('/create', flashSaleController.createFlashSale);
FlashSaleRouter.get('/', flashSaleController.getAllFlashSales);
FlashSaleRouter.get('/active', flashSaleController.getActiveFlashSales);
FlashSaleRouter.get('/:id', flashSaleController.getFlashSaleById);
FlashSaleRouter.put('/update/:id', flashSaleController.updateFlashSale);
FlashSaleRouter.delete('/delete/:id', flashSaleController.deleteFlashSale);

export default FlashSaleRouter; 