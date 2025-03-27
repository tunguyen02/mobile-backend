import User from "../models/user.model.js";
import tokenService from "../services/token.service.js";

const authMiddleware = {
    protect: async (req, res, next) => {
        try {
            // Get token
            let token;
            if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
                token = req.headers.authorization.split(' ')[1];
            }

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Please login to access this resource'
                });
            }

            // Verify token
            const decoded = tokenService.verifyAccessToken(token);
            if (!decoded) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired token'
                });
            }

            // Check if user exists
            const currentUser = await User.findById(decoded.id);
            if (!currentUser) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if password changed after token issued
            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return res.status(401).json({
                    success: false,
                    message: 'Password recently changed, please login again'
                });
            }

            // Grant access
            req.user = currentUser;
            next();
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    restrictTo: (...roles) => {
        return (req, res, next) => {
            if (!roles.includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to perform this action'
                });
            }
            next();
        }
    }
};

export default authMiddleware;