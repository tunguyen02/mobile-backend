import jwt from 'jsonwebtoken';

const tokenService = {
    generateAccessToken: (user) => {
        return jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN }
        )
    },

    generateRefreshToken: (user) => {
        return jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
        )
    },

    validateRefreshToken: (refreshToken) => {
        try {
            return jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch (err) {
            return null;
        }
    }
};

export default tokenService;