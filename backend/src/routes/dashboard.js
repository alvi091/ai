const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, dashboardController.getDashboard);

module.exports = router;
