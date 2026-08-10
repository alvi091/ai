const express = require('express');
const router = express.Router();
const { analyzeProduct } = require('../controllers/buyAnalysisController');

router.post('/', analyzeProduct);

module.exports = router;
