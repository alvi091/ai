const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');

router.get('/dashboard', authenticate, adminController.getAdminDashboard);
router.get('/users', authenticate, adminController.getAllUsers);
router.put('/products/:id', authenticate, adminController.updateProduct);
router.delete('/products/:id', authenticate, adminController.deleteProduct);
router.post('/prices', authenticate, adminController.updatePrices);

module.exports = router;
