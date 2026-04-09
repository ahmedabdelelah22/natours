const Review = require('../models/reviewModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
// middleware to set tour and user ids
exports.setTourUserIds = (req, res, next) => {

  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
    next();

};

// exports.createReview = catchAsync(async (req, res, next) => {
//   const newReview = await Review.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       review: newReview
//     }
//   });
// });
exports.getAllReviews = factory.getAll(Review)
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.getReview = factory.getOne(Review);



