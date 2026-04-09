const express = require('express');
const router = express.Router();
const viewController = require('../controllers/viewController')
const authController = require('../controllers/authController')
const userController = require('../controllers/userController')

router.get('/',authController.isLoggedIn, viewController.getOverview);
router.get('/tours/:id',authController.isLoggedIn, viewController.getTour);
router.get('/login',authController.isLoggedIn, viewController.getLoginForm);
router.get('/account',authController.protect,  viewController.getAccount);
router.get('/my-tours',authController.protect, authController.isLoggedIn, viewController.getMyTours);

module.exports = router;
