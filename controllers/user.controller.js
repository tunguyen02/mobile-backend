import tokenService from '../services/token.service.js';
import userService from '../services/user.service.js';
const userController = {
    signup: async (req, res) => {
        try {
            const { name, email, password, passwordConfirm } = req.body;
            if (password !== passwordConfirm) {
                return res.status(400).json({
                    success: false,
                    message: 'Passwords are not the same!'
                });
            }
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
            if (!email || !password) {
                return res.status(400).json({
                    message: 'Please provide email and password'
                });
            }
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
            })
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
};

export default userController;