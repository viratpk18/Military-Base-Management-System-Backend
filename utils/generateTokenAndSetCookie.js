import jwt from 'jsonwebtoken';
import { generateAccessToken, generateRefreshToken } from './token.js';

export const generateTokenAndSetCookie = (res, payload) => {
    const isProduction = process.env.NODE_ENV === 'production'
    console.log("isProduction", isProduction);

    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)

    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        // sameSite: 'None',
        secure: isProduction,
        maxAge: 24 * 60 * 60 * 1000, // 1 days
    })

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        // sameSite: 'None',
        secure: isProduction,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    })

    return { accessToken, refreshToken };

}