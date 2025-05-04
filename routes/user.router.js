import { Router } from "express";
import userController from "../controllers/user.controller.js";
import multer from 'multer';
import authMiddleware from "../middlewares/auth.middleware.js";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const UserRouter = Router();

// Auth routes
UserRouter.post('/auth/signup', userController.signup);
UserRouter.post('/auth/login', userController.login);
UserRouter.post('/auth/signout', userController.signOut);
UserRouter.post('/auth/refresh-access-token', userController.refreshAccessToken);


UserRouter.get('/get-all', userController.getAllUsers);
UserRouter.get('/total-users', userController.countTotalUsers);
UserRouter.get('/get-by-id/:userId', userController.getUserById);
UserRouter.delete('/delete/:userId', userController.deleteUser);

// User routes
UserRouter.get('/user-information', authMiddleware.protect, userController.getUserInformation);
UserRouter.patch('/update-profile', authMiddleware.protect, userController.updateProfile);
UserRouter.patch('/change-avatar', authMiddleware.protect, upload.single('avatarImage'), userController.changeAvatar);

// Password management
UserRouter.post('/auth/forgot-password', userController.forgotPassword);
UserRouter.post('/auth/reset-password/:token', userController.resetPassword);
UserRouter.post('/auth/change-password', authMiddleware.protect, userController.changePassword);

// API lấy ID của Admin
UserRouter.get('/admin-id', userController.getAdminId);

export default UserRouter;