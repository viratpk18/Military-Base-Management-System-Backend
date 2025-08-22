import jwt from 'jsonwebtoken'
import User from '../DB/models/users.model.js';

export const verifyAccessToken = async (req, res, next) => {
    const token = req.cookies.accessToken;

    if (!token) {
        return res.status(401).json({ message: 'Access denied. Token missing' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        const user = await User.findById(decoded.id); // get user's base

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // console.log("User from access:", user);

        req.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            baseId: user.base || null
        };

        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

export const verifyRefreshToken = (req, res, next) => {
    const token = req.cookies.refreshToken
    // console.log("refreshToken", token);
    if (!token) {
        return res.status(401).json({ message: 'Refresh token missing' })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
        req.user = decoded
        next()
    } catch (err) {
        return res.status(403).json({ message: 'Invalid or expired refresh token' })
    }
}

export const verifyRole = (requiredRoles) => {
    return (req, res, next) => {
        // console.log("Allowed roles", requiredRoles);
        // console.log("Logged in User :", req.user);

        if (!req.user || !requiredRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied. Insufficient permissions' });
        }
        next();
    };
};
