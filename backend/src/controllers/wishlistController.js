const prisma = require('../database');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const { asyncHandler } = require('../utils/asyncHandler');

const getWishlist = asyncHandler(async (req, res) => {
  const items = await prisma.wishlist.findMany({ where: { userId: req.user.id }, include: { product: true }, orderBy: { createdAt: 'desc' } });
  res.json({ wishlist: items });
});

const addToWishlist = asyncHandler(async (req, res) => {
  const { productId, notes } = req.body;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new NotFoundError('Product not found');
  const existing = await prisma.wishlist.findUnique({ where: { userId_productId: { userId: req.user.id, productId } } });
  if (existing) throw new BadRequestError('Product already in wishlist');
  const item = await prisma.wishlist.create({ data: { userId: req.user.id, productId, notes }, include: { product: true } });
  res.status(201).json({ wishlistItem: item });
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.wishlist.deleteMany({ where: { id, userId: req.user.id } });
  res.json({ message: 'Removed from wishlist' });
});

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
