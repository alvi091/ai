const express = require('express');
const router = express.Router();
const compareController = require('../controllers/compareController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, compareController.getComparisons);
router.post('/', authenticate, compareController.createComparison);
router.delete('/:id', authenticate, compareController.deleteComparison);

module.exports = router;
