const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
// const User = require('./userModel');
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal then 40 characters'],
      minlength: [10, 'A tour name must have more or equal then 10 characters'],
      // validate: [validator.isAlpha, 'Tour name must only contain characters'],
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty must be: easy, medium, or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
      // 4.666 → 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
      min: [0, 'minmum price 0'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    slug: String,
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      trim: true,
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      type: {
        type: String,
        enum: ['Point'], //Ensures only "Point" is allowed
        default: 'Point',
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          enum: ['Point'], //Ensures only "Point" is allowed
          default: 'Point',
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // reference to User model
        required: [true, 'Tour must have at least one guide'],
      },
    ],
  },
  //It tells Mongoose to include virtual properties when converting documents to JSON or objects.
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
// ADD THESE INDEXES:
// tourSchema.index({ name: 1 });
tourSchema.index({ difficulty: 1 });
tourSchema.index({ ratingsAverage: -1 });
tourSchema.index({ createdAt: -1 });
// ADD GEOSPATIAL INDEXES:
 tourSchema.index({ startLocation: '2dsphere' });
 
// tourSchema.index({ 'locations.coordinates': '2dsphere' });
// COMPOUND INDEXES FOR COMMON QUERIES:
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ difficulty: 1, ratingsAverage: -1 });
// TEXT INDEX FOR SEARCH:
tourSchema.index({ name: 'text', summary: 'text', description: 'text' });


tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});
// virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});
//Document middelware runs before .save() and .create()
tourSchema.pre('save', function () {
  this.slug = slugify(this.name, { lower: true });
});

// tourSchema.post('save', function (doc) {
//  // console.log('Tour saved:', doc.name);
// });

//Query middelware
// Hide secret tours in find queries
tourSchema.pre(/^find/, function () {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
});

// tourSchema.post(/^find/, function (docs) {
// //  console.log(`Query took ${Date.now() - this.start} ms`);
// });
//Populate guides automatically on find queries
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: 'name email role photo', // select only these fields
  });
});


//aggregation middelware
// tourSchema.pre('aggregate', function () {
//   this.pipeline().unshift({
//     $match: { secretTour: { $ne: true } },
//   });
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;

// | Hook   | When it runs     | Can modify data? |
// | ------ | ---------------- | ---------------- |
// | `pre`  | Before DB action | ✅ Yes           |
// | `post` | After DB action  | ❌ No            |

// | Hook   | When it runs     | Can modify query/data?                              |
// | ------ | ---------------- | --------------------------------------------------- |
// | `pre`  | Before DB action | ✅ Yes                                              |
// | `post` | After DB action  | ❌ Cannot modify result sent to DB (but can read it)|

// this.pipeline() → returns the aggregation pipeline array
// .unshift(stage) → adds a new stage to the start of that array
