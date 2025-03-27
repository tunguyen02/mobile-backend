import { Router } from "express";
import userController from "../controllers/user.controller.js";
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const UserRouter = Router();

// Auth routes
UserRouter.post('/auth/signup', userController.signup);
UserRouter.post('/auth/login', userController.login);
UserRouter.post('/auth/signout', userController.signOut);

// User routes
UserRouter.get('/user-information', userController.getUserInfomations);
UserRouter.patch('/update-profile', userController.updateProfile);
UserRouter.patch('/change-avatar', upload.single('avatar'), userController.changeAvatar);

// Password management
UserRouter.post('/auth/forgot-password', userController.forgotPassword);
UserRouter.post('/auth/reset-password/:token', userController.resetPassword);
UserRouter.post('/auth/change-password', userController.changePassword);

export default UserRouter;