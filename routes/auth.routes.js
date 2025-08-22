import express from 'express';
import { createUser, signIn, logout ,getAllUsers, getUserById, updateUser, updateUserPassword, deleteUser } from '../controllers/auth.Controller.js';
import { verifyAccessToken, verifyRefreshToken, verifyRole } from '../middleware/verifyToken.js';
import { getMe } from '../controllers/auth.Controller.js';
import { refreshToken } from '../controllers/auth.Controller.js';

const router = express.Router();

router.get('/me', verifyAccessToken, getMe)

router.post('/refresh', verifyRefreshToken, refreshToken)

// POST /auth/create-user - Create a new user and send OTP
router.post('/create-user', verifyAccessToken, verifyRole(['admin']), createUser);

// ✅ GET /users - Get all users
router.get('/get', getAllUsers);

// ✅ GET /users/:id - Get single user by ID
router.get('/get/:id', getUserById);

// ✅ PUT /users/:id - Update user data
router.put('/update/:id',verifyAccessToken, verifyRole(['admin']), updateUser);

// ✅ PATCH /users/:id/password - Update user password
router.patch('/:id/password',verifyAccessToken, verifyRole(['admin']), updateUserPassword);

// ✅ DELETE /users/:id - Delete user
router.delete('/delete/:id',verifyAccessToken, verifyRole(['admin']), deleteUser);

// POST /auth/signin - Login user; resend OTP if email not verified
router.post('/signin', signIn);

// POST /auth/logout - Logout user (client should clear token)
router.post('/logout', logout);

export default router;
