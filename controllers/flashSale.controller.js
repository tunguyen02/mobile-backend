import flashSaleService from '../services/flashSale.service.js';

const flashSaleController = {
    createFlashSale: async (req, res) => {
        try {
            console.log('Creating flash sale with data:', JSON.stringify(req.body, null, 2));
            const flashSale = await flashSaleService.createFlashSale(req.body);

            res.status(201).json({
                success: true,
                data: flashSale
            });
        } catch (error) {
            console.error('Error creating flash sale:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                stack: process.env.NODE_ENV === 'production' ? null : error.stack
            });
        }
    },

    getAllFlashSales: async (req, res) => {
        try {
            console.log('Getting all flash sales');
            const flashSales = await flashSaleService.getAllFlashSales();

            res.status(200).json({
                success: true,
                data: flashSales
            });
        } catch (error) {
            console.error('Error getting all flash sales:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                stack: process.env.NODE_ENV === 'production' ? null : error.stack
            });
        }
    },

    getActiveFlashSales: async (req, res) => {
        try {
            const flashSales = await flashSaleService.getActiveFlashSales();

            res.status(200).json({
                success: true,
                data: flashSales
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    getFlashSaleById: async (req, res) => {
        try {
            const { id } = req.params;
            const flashSale = await flashSaleService.getFlashSaleById(id);

            res.status(200).json({
                success: true,
                data: flashSale
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    updateFlashSale: async (req, res) => {
        try {
            const { id } = req.params;
            const flashSale = await flashSaleService.updateFlashSale(id, req.body);

            res.status(200).json({
                success: true,
                data: flashSale
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    deleteFlashSale: async (req, res) => {
        try {
            const { id } = req.params;
            await flashSaleService.deleteFlashSale(id);

            res.status(204).json({
                success: true,
                data: null
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
};

export default flashSaleController; 