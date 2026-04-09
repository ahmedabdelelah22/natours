const express = require('express');
const tourController = require('../controllers/tourController');
const router = express.Router();
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');
//router.param('id', tourController.checkID)

// Create a checkBody middleware
// Ceck if body contains the name and price property
// If not , send back 400 (bad request)
// Add it to the post handler stack

// So if reviewRouter has:
// router.route('/').get(getAllReviews).post(createReview);
// Then the final routes become:
// GET    /tours/:tourId/reviews
// POST   /tours/:tourId/reviews
router.use('/:tourId/reviews', reviewRouter);
router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);
router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan,
  );

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
// GET http://localhost:3000/api/v1/tours/tours-within/100/center/48.8566,2.3522/unit/km
router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);
router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour,
  );
router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour,
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour,
  );

module.exports = router;

//protecting routes by middleware
