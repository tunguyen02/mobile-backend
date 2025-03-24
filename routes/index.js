import userRouters from "./user.router.js"


const routes = (app) => {
    app.use('/api/user', userRouters);
}

export default routes;