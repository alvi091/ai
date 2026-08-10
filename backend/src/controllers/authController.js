const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../database');
const { generateToken } = require('../utils/helpers');
const { BadRequestError, UnauthorizedError } = require('../utils/errors');
const { asyncHandler } = require('../utils/asyncHandler');

const signup = asyncHandler(async (req, res) => {
  const { email, password, name } = req.validatedBody;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new BadRequestError('Email already registered');
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  const token = generateToken(user.id);
  res.status(201).json({ user, token });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validatedBody;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new UnauthorizedError('Invalid email or password');
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw new UnauthorizedError('Invalid email or password');
  const token = generateToken(user.id);
  res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.validatedBody;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) { res.json({ message: 'If the email exists, a reset link has been sent' }); return; }
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetExpires = new Date(Date.now() + 3600000);
  await prisma.user.update({ where: { id: user.id }, data: { resetToken, resetExpires } });
  console.log(`Reset token for ${email}: ${resetToken}`);
  res.json({ message: 'If the email exists, a reset link has been sent' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.validatedBody;
  const user = await prisma.user.findFirst({ where: { resetToken: token, resetExpires: { gt: new Date() } } });
  if (!user) throw new BadRequestError('Invalid or expired reset token');
  const hashedPassword = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword, resetToken: null, resetExpires: null } });
  res.json({ message: 'Password reset successful' });
});

const getProfile = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, name: true, preferredBrands: true, budgetMin: true, budgetMax: true, favoriteColors: true, shoeSize: true, clothingSize: true, createdAt: true },
  });
  res.json({ user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const data = req.validatedBody;
  const user = await prisma.user.update({
    where: { id: req.user.id }, data,
    select: { id: true, email: true, name: true, preferredBrands: true, budgetMin: true, budgetMax: true, favoriteColors: true, shoeSize: true, clothingSize: true },
  });
  res.json({ user });
});

module.exports = { signup, login, forgotPassword, resetPassword, getProfile, updateProfile };
