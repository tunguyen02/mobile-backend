import tokenService from '../services/token.service.js';
import userService from '../services/user.service.js';
import cloudinaryServices from '../services/cloudinary.service.js';

const userController = {
    signup: async (req, res) => {
        try {
            const { name, email, password, passwordConfirm } = req.body;

            const newUser = await userService.signup(name, email, password, passwordConfirm);

            res.status(201).json({
                message: 'User created successfully',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            const user = await userService.login(email, password);

            const accessToken = tokenService.generateAccessToken(user);
            const refreshToken = tokenService.generateRefreshToken(user);

            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
            });

            return res.status(200).json({
                message: "Login successfully",
                accessToken
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    getUserInformation: async (req, res) => {
        const userId = req?.user?._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        try {
            const user = await userService.getUserInformation(userId);
            return res.status(200).json({
                user,
                success: true,
                message: 'User information retrieved successfully',
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    signOut: async (req, res) => {
        try {
            res.clearCookie('refresh_token');

            res.status(200).json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    changeAvatar: async (req, res) => {
        const userId = req?.user?._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const avatarFile = req.file;
        if (!avatarFile) {
            return res.status(400).json({
                success: false,
                message: 'Avatar file is required'
            });
        }

        try {
            const avatarUrl = await cloudinaryServices.uploadFile(avatarFile);
            await userService.updateAvatar(userId, avatarUrl);

            return res.status(200).json({
                success: true,
                message: 'Avatar updated successfully',
                avatarUrl: avatarUrl
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    updateProfile: async (req, res) => {
        const userId = req?.user?._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const { name, phoneNumber, address } = req.body;
        if (!name && !phoneNumber && !address) {
            return res.status(400).json({
                success: false,
                message: 'At least one field is required to update'
            });
        }

        try {
            const updatedUser = await userService.updateProfile(userId, { name, phoneNumber, address });

            return res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                user: updatedUser
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },
    refreshAccessToken: async (req, res) => {
        try {
            const refreshToken = req.cookies.refresh_token;

            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    message: 'Refresh token not found'
                });
            }

            const newAccessToken = await userService.refreshAccessToken(refreshToken);

            return res.status(200).json(newAccessToken);
        } catch (error) {
            res.status(401).json({
                success: false,
                message: error.message
            });
        }
    },

    forgotPassword: async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }

            const result = await userService.forgotPassword(email);

            const response = {
                success: true,
                message: 'Reset password link has been sent to your email'
            };

            // Chỉ thêm token vào response trong môi trường development
            if (process.env.NODE_ENV === 'development' && result.devToken) {
                response.resetToken = result.devToken;
            }

            return res.status(200).json(response);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    resetPassword: async (req, res) => {
        try {
            const { token } = req.params;
            const { password, passwordConfirm } = req.body;

            if (!password || !passwordConfirm) {
                return res.status(400).json({
                    success: false,
                    message: 'Password and password confirmation are required'
                });
            }

            if (password !== passwordConfirm) {
                return res.status(400).json({
                    success: false,
                    message: 'Passwords do not match'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters'
                });
            }

            await userService.resetPassword(token, password, passwordConfirm);

            return res.status(200).json({
                success: true,
                message: 'Password has been reset successfully'
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    changePassword: async (req, res) => {
        const userId = req?.user?._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const { currentPassword, newPassword, newPasswordConfirm } = req.body;

        if (!currentPassword || !newPassword || !newPasswordConfirm) {
            return res.status(400).json({
                success: false,
                message: 'Current password, new password, and confirmation are required'
            });
        }

        if (newPassword !== newPasswordConfirm) {
            return res.status(400).json({
                success: false,
                message: 'New passwords do not match'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        try {
            await userService.changePassword(userId, currentPassword, newPassword);

            // Logout user after password change
            res.clearCookie('refresh_token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict'
            });

            return res.status(200).json({
                success: true,
                message: 'Password changed successfully. Please login again.'
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    getAllUsers: async (req, res) => {
        try {
            const { users, countUser } = await userService.getAllUsers();
            res.status(200).json({
                message: "Get all users successfully",
                data: users,
                countUser: countUser
            });
        } catch (error) {
            res.status(400).json({
                message: error.message
            });
        }
    },

    getUserById: async (req, res) => {
        const { userId } = req.params;
        if (!userId) return res.status(404).json({
            message: 'UserId invalid'
        })

        try {
            const user = await userService.getUserById(userId);
            return res.status(200).json({
                message: 'Get user by id successfully',
                data: user
            });
        }
        catch (error) {
            return res.status(400).json({
                message: error.message
            });
        }
    },

    deleteUser: async (req, res) => {
        const { userId } = req.params;
        if (!userId) return res.status(404).json({
            message: 'UserId invalid'
        })

        try {
            await userService.deleteUser(userId);
            return res.status(200).json({
                message: 'Delete user successfully'
            });
        }
        catch (error) {
            return res.status(400).json({
                message: error.message
            });
        }
    },

    countTotalUsers: async (req, res) => {
        try {
            const totalUsers = await userService.countTotalUsers();
            return res.status(200).json({
                success: true,
                totalUsers: totalUsers
            });
        }
        catch (error) {
            return res.status(400).json({
                message: error.message
            });
        }
    }
};

export default userController;