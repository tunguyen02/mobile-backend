import { Router } from 'express';
import exportFileController from '../controllers/exportFile.controller.js';

const ExportFileRouter = Router();

ExportFileRouter.get('/export-file', exportFileController.exportProductExcel);

export default ExportFileRouter;