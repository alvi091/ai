const router = require('express').Router();
const { analyzeUrl, getJob } = require('../controllers/analyzeUrlController');

router.post('/', analyzeUrl);
router.get('/:jobId', getJob);

module.exports = router;
