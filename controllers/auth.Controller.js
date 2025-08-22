import bcrypt from 'bcryptjs';
import User from '../DB/models/users.model.js';
import { generateAccessToken, generateRefreshToken } from '../utils/token.js'
import { generateTokenAndSetCookie } from '../utils/generateTokenAndSetCookie.js';

const isProduction = process.env.NODE_ENV === 'production'

// === GET /api/auth/me ===
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password').populate('base', 'name state district');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userData = {
            name: user.name,
            email: user.email,
            role: user.role,
        };

        if (user.base) {
            userData.baseId = user.base._id;
            userData.baseName = user.base.name;
            userData.state = user.base.state;
            // You can include `district` too if needed:
            // userData.district = user.base.district;
        }

        res.json({ user: userData });
    } catch (error) {
        console.error("Error in getMe:", error);
        res.status(500).json({ message: "Failed to retrieve user", error: error.message });
    }
};

// === POST /api/auth/refresh ===
export const refreshToken = (req, res) => {
    const user = req.user
    // console.log("User", user);   
    try {
        const newAccessToken = generateAccessToken(user)
        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            sameSite: isProduction ? "none" : "lax",
            secure: isProduction,
            maxAge: 24 * 60 * 60 * 1000, // 1 days
        })

        res.json({ success: true })
    } catch (err) {
        return res.status(403).json({ message: 'Invalid refresh token' })
    }
}

// ✅ createUser
export const createUser = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,
            base, // base ID now
        } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered. Try logging in.' });
        }

        if (!role) {
            return res.status(400).json({ message: 'Role must be declared' });
        }

        // 🔍 Enforce base commander uniqueness per base
        if (role === 'base_commander') {
            const commanderExists = await User.findOne({ role: 'base_commander', base });
            if (commanderExists) {
                return res.status(400).json({ message: 'This base already has a base commander' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const userData = {
            name,
            email,
            password: hashedPassword,
            role,
        };

        if (role === 'base_commander' || role === 'logistics_officer') {
            if (!base) {
                return res.status(400).json({ message: 'Base ID is required for this role' });
            }
            userData.base = base;
        }

        const user = await User.create(userData);

        res.status(201).json({ message: 'User created successfully', userId: user._id });
    } catch (err) {
        console.error('CreateUser Error:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ✅ Get All Users (populated)
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().populate('base');
        res.status(200).json(users);
    } catch (err) {
        console.error('GetAllUsers Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ✅ Get User By ID (populated)
export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate('base');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user);
    } catch (err) {
        console.error('GetUserById Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ✅ Update User Info (excluding password)
export const updateUser = async (req, res) => {
    try {
        const { name, role, base, isActive } = req.body;
        const userId = req.params.id;

        // 🧠 Check if role is base_commander and ensure uniqueness
        if (role === 'base_commander' && base) {
            const existingCommander = await User.findOne({
                role: 'base_commander',
                base,
                _id: { $ne: userId }, // exclude current user
            });

            if (existingCommander) {
                return res.status(400).json({
                    message: 'Another base commander already exists for this base',
                });
            }
        }
        const updates = { name, role, isActive };

        if (['base_commander', 'logistics_officer'].includes(role)) {
            updates.base = base;
        } else {
            updates.base = undefined;
        }

        const user = await User.findByIdAndUpdate(userId, updates, { new: true }).populate('base');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json({ message: 'User updated successfully', user });
    } catch (err) {
        console.error('UpdateUser Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ✅ Update User Password
export const updateUserPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { password: hashedPassword },
            { new: true }
        );

        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('UpdatePassword Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ✅ Delete User
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('DeleteUser Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ✅ SIGN IN 
export const signIn = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).populate('base');
        console.log('User found:', user);
        console.log('Password from request:', password);
        if (user) {
            console.log('Password in DB:', user.password);
        }
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match result:', isMatch);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const userData = {
            name: user.name,
            email: user.email,
            role: user.role,
        };

        const { accessToken, refreshToken } = generateTokenAndSetCookie(res, user)

        res.status(200).json({
            message: 'Login successful',
            accessToken,
            refreshToken,
            user: {
                name: user.name,
                email: user.email,
                role: user.role,
                baseId: user.base?._id,
                baseName: user.base?.name,
                state: user.base?.state,
            },
        });
    } catch (err) {
        console.error('SignIn Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ✅ LOGOUT FUNCTION
export const logout = async (req, res) => {
    try {
        const isProduction = process.env.NODE_ENV === 'production';

        // Clear both access and refresh tokens
        res.clearCookie('accessToken', {
            httpOnly: true,
            sameSite: isProduction ? 'None' : 'Lax',
            secure: isProduction,
        });

        res.clearCookie('refreshToken', {
            httpOnly: true,
            sameSite: isProduction ? 'None' : 'Lax',
            secure: isProduction,
        });

        return res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
        console.error('Logout Error:', err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};


