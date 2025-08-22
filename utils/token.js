import jwt from 'jsonwebtoken'

export const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id || user.id, email: user.email, role: user.role, base: user.base }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '7d'
  })
}

export const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id || user.id, email: user.email ,role: user.role,  base: user.base}, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '30d'
  })
}
