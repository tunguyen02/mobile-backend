import User from "../model/user.model.js";
import jwt from "jsonwebtoken";

const authMiddleware = {
    protect: async (req, res, next) => {
        try {
            let token;
            if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
                token = req.headers.authorization.split(' ')[1];
            }

            if (!token) {
                return res.status(401).json({
                    status: 'fail',
                    message: 'You are not logged in! Please log in to get access'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const currentUser = await User.findById(decoded.id);
            if (!currentUser) {
                return res.status(401).json({
                    status: 'fail',
                    message: 'The user belonging to this token does no longer exist'
                });
            }
            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return res.status(401).json({
                    status: 'fail',
                    message: 'User recently changed password! Please log in again'
                });
            }
            req.user = currentUser;
            next();
        } catch (error) {
            res.status(400).json({
                status: 'fail',
                message: error
            });
        }
    },

    restrictTo: (...roles) => {
        return (req, res, next) => {
            if (!roles.includes(req.user.role)) {
                return res.status(403).json({
                    status: 'fail',
                    message: 'You do not have permission to perform this action'
                });
            }
            next();
        }
    }
};

export default authMiddleware;