import User from "../models/user.model.js";

const userService = {
    signup: async (name, email, password, passwordConfirm) => {
        try {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                throw new Error('Email already exists');
            }
            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }
            const newUser = await User.create({
                name,
                email,
                password,
                passwordConfirm
            })
            return newUser;
        } catch (error) {
            throw new Error(error.message);
        }
    },
    login: async (email, password) => {
        if (!email || !password) {
            throw new Error('Please provide email and password');
        }
        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.correctPassword(password, user.password))) {
            throw new Error('Incorrect email or password');
        }
        return {
            _id: user?._id,
            email: user?.email,
            role: user?.role
        }
    }
};

export default userService;