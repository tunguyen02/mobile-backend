import userRouters from "./user.router.js"
import brandRoutes from "./brand.router.js";
import productRoutes from "./product.router.js";


const routes = (app) => {
    app.use('/api/user', userRouters);
    app.use('/api/brand', brandRoutes);
    app.use('/api/product', productRoutes);
}

export default routes;