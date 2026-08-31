const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const analytics = require('../controllers/adminAnalyticsController');

router.use(authenticate, isAdmin);

router.get('/dashboard', adminController.getAdminDashboard);
router.get('/users', adminController.getAllUsers);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);
router.post('/prices', adminController.updatePrices);
router.post('/promote/:userId', adminController.promoteUser);
router.post('/demote/:userId', adminController.demoteUser);

router.get('/analytics/dashboard', analytics.getDashboard);
router.get('/analytics/users', analytics.getUsers);
router.get('/analytics/users/:id', analytics.getUserDetail);
router.get('/analytics/analyses', analytics.getAnalyses);
router.get('/analytics/marketplaces', analytics.getMarketplaceStats);
router.get('/analytics/ai-usage', analytics.getAIUsage);
router.get('/analytics/errors', analytics.getErrors);
router.get('/analytics/retention', analytics.getRetention);
router.get('/analytics/activity', analytics.getActivity);
router.get('/analytics/decisions', analytics.getDecisionStats);
router.get('/analytics/top-products', analytics.getTopProducts);

module.exports = router;
