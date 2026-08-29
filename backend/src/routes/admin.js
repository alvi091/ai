const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/auth');

router.get('/dashboard', authenticate, isAdmin, adminController.getAdminDashboard);
router.get('/users', authenticate, isAdmin, adminController.getAllUsers);
router.put('/products/:id', authenticate, isAdmin, adminController.updateProduct);
router.delete('/products/:id', authenticate, isAdmin, adminController.deleteProduct);
router.post('/prices', authenticate, isAdmin, adminController.updatePrices);
router.post('/promote/:userId', authenticate, isAdmin, adminController.promoteUser);
router.post('/demote/:userId', authenticate, isAdmin, adminController.demoteUser);

module.exports = router;
