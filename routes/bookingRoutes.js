const express = require('express');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController')
const router = express.Router();

router.get('/my-tours',authController.protect, bookingController.getMyTours); // ← add this

router.get('/checkout-session/:tourId',authController.protect,bookingController.getCheckoutSession)  

module.exports = router;


//ngrok http --domain=supercolossal-shani-indebtedly.ngrok-free.dev 3000