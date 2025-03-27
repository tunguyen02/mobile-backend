import userRouters from "./user.router.js"
import brandRoutes from "./brand.router.js";
import productRoutes from "./product.router.js";
import productDetailRoutes from "./productDetails.router.js";
import cartRoutes from "./cart.router.js";
import orderRoutes from "./order.router.js";
import reportRouters from "./exportFile.router.js";
import reviewRoutes from "./review.router.js";
import flashSaleRoutes from "./flashSale.router.js";


const routes = (app) => {
    app.use('/api/user', userRouters);
    app.use('/api/brand', brandRoutes);
    app.use('/api/product', productRoutes);
    app.use('/api/product-detail', productDetailRoutes);
    app.use('/api/cart', cartRoutes);
    app.use('/api/order', orderRoutes);
    app.use('/api/report', reportRouters);
    app.use('/api/review', reviewRoutes);
    app.use('/api/flash-sale', flashSaleRoutes);
}

export default routes;