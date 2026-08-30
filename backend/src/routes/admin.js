const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/dashboard', adminController.getAdminDashboard);
router.get('/users', adminController.getAllUsers);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);
router.post('/prices', adminController.updatePrices);
router.post('/promote/:userId', adminController.promoteUser);
router.post('/demote/:userId', adminController.demoteUser);

module.exports = router;
