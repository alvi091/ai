const express = require('express');
const router = express.Router();
const amazonController = require('../controllers/amazonController');

router.get('/status', amazonController.status);
router.get('/search', amazonController.search);
router.post('/sync', amazonController.sync);
router.get('/:asin', amazonController.getByAsin);

module.exports = router;
