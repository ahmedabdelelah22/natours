const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
{
  review: {
    type: String,
    required: [true, 'Review can not be empty!']
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Review must belong to a user']
  },
  tour: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: [true, 'Review must belong to a tour']
  }
},
{
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
}
);

/////////////////////////////////////////////////
// Prevent duplicate reviews
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

/////////////////////////////////////////////////
// Populate user data
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo'
  });
});

/////////////////////////////////////////////////
// Static function to calculate ratings
reviewSchema.statics.calcAverageRatings = async function(tourId) {

  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: Math.round(stats[0].avgRating * 10) / 10
    });

  } else {

    // if no reviews left
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });

  }
};

/////////////////////////////////////////////////
// ### What it does:
// - Runs **AFTER** a review is saved to database
// - `this` = the new review that was just created
// - `this.tour` = the tour ID 
// - `this.constructor` = the Review MODEL
// - **Calls:** `Review.calcAverageRatings(tourId)`
reviewSchema.post('save', function() {
  this.constructor.calcAverageRatings(this.tour);
});

/////////////////////////////////////////////////
// ### What it does:
// - Runs **BEFORE** update or delete operation
// - `/^findOneAnd/` = matches:
//   - `findByIdAndUpdate`
//   - `findByIdAndDelete`
//   - `findOneAndUpdate`
//   - `findOneAndDelete`
// - **Stores** the current review data in `this.r`
// - **Why?** Because after deletion, the document is GONE!
// - We need to capture the **tourId BEFORE deletion**
reviewSchema.pre(/^findOneAnd/, async function(next) {
  this.r = await this.findOne(); // store review
});
// ### What it does:
// - Runs **AFTER** update or delete operation
// - `if (this.r)` = check if review was stored in pre hook
// - `this.r.tour` = the stored tourId
// - **Calls:** `Review.calcAverageRatings(this.r.tour)`
reviewSchema.post(/^findOneAnd/, async function() {
  if (this.r) {
    await this.r.constructor.calcAverageRatings(this.r.tour);
  }
});

/////////////////////////////////////////////////

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;