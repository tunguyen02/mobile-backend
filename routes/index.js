import userRouters from "./user.router.js"
import brandRoutes from "./brand.router.js";


const routes = (app) => {
    app.use('/api/user', userRouters);
    app.use('/api/brand', brandRoutes);
}

export default routes;