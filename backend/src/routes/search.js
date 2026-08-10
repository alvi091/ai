const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { searchSchema } = require('../utils/schemas');

router.post('/', optionalAuth, validate(searchSchema), searchController.search);
router.get('/history', authenticate, searchController.getSearchHistory);
router.delete('/history/:id', authenticate, searchController.deleteSearchHistory);

module.exports = router;
