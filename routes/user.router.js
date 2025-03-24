import { Router } from "express";
import userController from "../controllers/user.controller.js";

const UserRouter = Router();

UserRouter.post('/auth/signup', userController.signup);
UserRouter.post('/auth/login', userController.login);


export default UserRouter;