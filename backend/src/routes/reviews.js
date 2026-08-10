const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

router.get('/analyze/:productId', reviewController.getReviewAnalysis);

module.exports = router;
