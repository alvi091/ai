const router = require('express').Router();
const { analyzeUrl } = require('../controllers/analyzeUrlController');

router.post('/', analyzeUrl);

module.exports = router;