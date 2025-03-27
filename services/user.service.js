import User from "../models/user.model.js";
import crypto from 'crypto';
import { sendResetPasswordEmail, sendPasswordChangedEmail } from './email.service.js';

const userService = {
    signup: async (name, email, password, passwordConfirm) => {
        try {
            if (!email || !password) {
                throw new Error('Please provide email and password');
            }

            if (password !== passwordConfirm) {
                throw new Error('Passwords are not the same');
            }

            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            const emailExists = await User.findOne({ email });
            if (emailExists) {
                throw new Error('Email already exists');
            }

            const newUser = await User.create({
                name,
                email,
                password,
                passwordConfirm
            });

            return {
                _id: newUser._id,
                email: newUser.email,
                role: newUser.role
            };
        } catch (error) {
            throw new Error(error.message);
        }
    },

    login: async (email, password) => {
        try {
            if (!email || !password) {
                throw new Error('Please provide email and password');
            }

            const user = await User.findOne({ email }).select('+password');
            if (!user || !(await user.correctPassword(password, user.password))) {
                throw new Error('Incorrect email or password');
            }

            return {
                _id: user._id,
                email: user.email,
                role: user.role
            };
        } catch (error) {
            throw new Error(error.message);
        }
    },
    getUserInformations: async (userId) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error("Invalid userId");
            }

            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            return {
                email: user.email,
                name: user.name,
                phoneNumber: user.phoneNumber,
                address: user.address,
                avatarUrl: user.avatarUrl,
                role: user.role
            }
        } catch (error) {
            throw new Error(error.message);
        }
    },
    updateAvatar: async (userId, avatarUrl) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error("Invalid userId");
            }

            if (!avatarUrl) {
                throw new Error("Avatar URL is required");
            }

            const user = await User.findByIdAndUpdate(
                userId,
                { avatarUrl },
                { new: true }
            );

            if (!user) {
                throw new Error("User not found");
            }

            return {
                avatarUrl: user.avatarUrl
            };
        } catch (error) {
            throw new Error(error.message);
        }
    },
    updateProfile: async (userId, { name, phoneNumber, address }) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error("Invalid userId");
            }

            if (!name && !phoneNumber && !address) {
                throw new Error("At least one field is required to update");
            }

            const updateData = {};
            if (name) updateData.name = name;
            if (phoneNumber) updateData.phoneNumber = phoneNumber;
            if (address) updateData.address = address;

            const user = await User.findByIdAndUpdate(
                userId,
                updateData,
                { new: true }
            );

            if (!user) {
                throw new Error("User not found");
            }

            return {
                name: user.name,
                phoneNumber: user.phoneNumber,
                address: user.address
            };
        } catch (error) {
            throw new Error(error.message);
        }
    },
    forgotPassword: async (email) => {
        try {
            const user = await User.findOne({ email });
            if (!user) {
                throw new Error('User not found');
            }

            // Tạo token để đặt lại mật khẩu
            const resetToken = user.createPasswordResetToken();
            await user.save({ validateBeforeSave: false });

            try {
                // Gửi email đặt lại mật khẩu
                await sendResetPasswordEmail(user, resetToken);

                return {
                    message: 'Reset password link sent to email',
                    // Trong môi trường phát triển, có thể trả về token để test
                    devToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
                };
            } catch (error) {
                // Nếu gửi email thất bại, reset token và expiry
                user.passwordResetToken = undefined;
                user.passwordResetExpires = undefined;
                await user.save({ validateBeforeSave: false });

                throw new Error('There was an error sending the email. Please try again later.');
            }
        } catch (error) {
            throw new Error(error.message);
        }
    },

    changePassword: async (userId, currentPassword, newPassword) => {
        try {
            const user = await User.findById(userId).select('+password');

            if (!user) {
                throw new Error('User not found');
            }

            if (!(await user.correctPassword(currentPassword, user.password))) {
                throw new Error('Current password is incorrect');
            }

            user.password = newPassword;
            user.passwordConfirm = newPassword;
            await user.save();

            // Gửi email xác nhận thay đổi mật khẩu
            await sendPasswordChangedEmail(user);

            return { message: 'Password changed successfully' };
        } catch (error) {
            throw new Error(error.message);
        }
    },

    resetPassword: async (token, password, passwordConfirm) => {
        try {
            // Hash token để so sánh với token trong DB
            const hashedToken = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            const user = await User.findOne({
                passwordResetToken: hashedToken,
                passwordResetExpires: { $gt: Date.now() }
            });

            if (!user) {
                throw new Error('Token is invalid or has expired');
            }

            user.password = password;
            user.passwordConfirm = passwordConfirm;
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;

            await user.save();

            // Gửi email xác nhận thay đổi mật khẩu
            await sendPasswordChangedEmail(user);

            return { message: 'Password reset successfully' };
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

export default userService;