import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function issueToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

export async function signup(req, res, next) {
  try {
    const { name, email, password, role = 'passenger' } = req.body || {}
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({ message: 'Name must be between 2 and 80 characters.' })
    }
    if (typeof email !== 'string' || email.length > 254 || !emailPattern.test(email.trim())) {
      return res.status(400).json({ message: 'Enter a valid email address.' })
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
      return res.status(400).json({ message: 'Password must be between 8 and 72 characters.' })
    }
    if (!['passenger', 'driver'].includes(role)) {
      return res.status(400).json({ message: 'Select a valid account type.' })
    }
    const normalizedEmail = email.trim().toLowerCase()
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ message: 'An account with that email already exists.' })
    }
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({ name: name.trim(), email: normalizedEmail, password: passwordHash, role })
    return res.status(201).json({ user: publicUser(user), token: issueToken(user) })
  } catch (error) {
    return next(error)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {}
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 72) {
      return res.status(400).json({ message: 'Enter your email and password.' })
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password')
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' })
    }
    return res.json({ user: publicUser(user), token: issueToken(user) })
  } catch (error) {
    return next(error)
  }
}

export function currentUser(req, res) {
  return res.json({ user: publicUser(req.user) })
}
