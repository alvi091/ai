const express = require('express');
const router = express.Router();
const decisionController = require('../controllers/decisionController');
const { authenticate, optionalAuth } = require('../middleware/auth');

router.post('/full', optionalAuth, decisionController.getFullDecision);
router.post('/suitability/:productId', optionalAuth, decisionController.getSuitability);
router.get('/price-fairness/:productId', decisionController.getPriceFairness);
router.get('/buy-decision/:productId', decisionController.getBuyDecision);
router.post('/match-score/:productId', optionalAuth, decisionController.getMatchScore);
router.get('/why-not-buy/:productId', decisionController.getWhyNotBuy);
router.post('/follow-up', decisionController.getFollowUpQuestions);
router.post('/bundle', optionalAuth, decisionController.getBundle);
router.get('/predictions', authenticate, decisionController.getPredictions);
router.get('/persona', authenticate, decisionController.getPersona);
router.get('/memory', authenticate, decisionController.getMemory);
router.patch('/memory', authenticate, decisionController.updateMemory);
router.post('/track-click', optionalAuth, decisionController.trackClick);
router.post('/track-event', optionalAuth, decisionController.trackAnalyticsEvent);

module.exports = router;
