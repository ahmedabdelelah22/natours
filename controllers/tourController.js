const  multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

const storage = multer.memoryStorage();

// 2) filter Only allow images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) cb(null, true);
  else cb(new AppError('Only images are allowed!',400), false);
};

// 1️⃣ What is fileFilter?
// fileFilter is an option you give to Multer.
// Its job: decide which uploaded files are allowed or rejected before they are saved.
// Multer calls it once for each file being uploaded.
// 2️⃣ Parameters
// req → The Express request object. You usually don’t need it here, but it’s available if you want to check something like the user.
// file → The file object Multer created, containing info like:
// file.originalname → original filename
// file.mimetype → type of file (like 'image/jpeg' or 'application/pdf')
// file.size → file size
// cb → The callback function you must call to tell Multer:
// cb(null, true) → accept this file
// cb(null, false) → silently reject it
// cb(new Error('message'), false) → reject it with an error

// Initialize multer
const upload = multer({ storage, fileFilter });
exports.uploadTourImages = upload.fields([
  {name:'imageCover',maxCount:1},
  {name:'images',maxCount:3}
]); // 'photo' must match input name in form

exports.resizeTourImages = catchAsync(async (req, res, next) => {

  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Images
  req.body.images = [];

//   ✅ Why Promise.all
// Processing multiple images is async — this ensures:
// All images are processed
// You wait before calling next()
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};
exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour,{path:'reviews'});
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: '$difficulty',
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: {
        avgPrice: 1,
      },
    },
    // {
    //   $match: {
    //     _id: {$ne: 'easy'}
    //   }
    // }
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        dates: { $push: '$startDates' },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: {
        month: '$_id',
        monthName: {
          $arrayElemAt: [
            [
              'January',
              'February',
              'March',
              'April',
              'May',
              'June',
              'July',
              'August',
              'September',
              'October',
              'November',
              'December',
            ],
            { $subtract: ['$_id', 1] },
          ],
        },
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { month: 1 },
    },
    {
      $limit: 6,
    },
  ]);

if (plan.length === 0) {
    return next(new AppError('No tours found for that year', 404));

}

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});



// /tour-distance/233/center/33.687782, -118.256831/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  
  const [lat, lng] = latlng.split(',');
  
  if(!lat || !lng){
    next(
    new AppError("please provide latitutr and longitude in the format lat,lng.",400)
)}
  // Convert to radians
  const radius = unit === 'mi' 
    ? distance / 3963.2
    : distance / 6371;
  
  // MongoDB geospatial query
  const tours = await Tour.find({
    startLocation: {
      $geoWithin: {
        $centerSphere: [[lng, lat], radius]  // ⚠️ [lng, lat]!
      }
    }
  });
  
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: { tours }
  });
});

exports.getDistances = catchAsync(async (req,res,next)=>{
   const { latlng, unit } = req.params;
  
  const [lat, lng] = latlng.split(',');
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
  
  if(!lat || !lng){
    next(
    new AppError("please provide latitutr and longitude in the format lat,lng.",400)
)}

const distances = await Tour.aggregate([
  {
    $geoNear: {
      near:{
        type: 'Point',
        coordinates: [lng * 1 , lat * 1]
      },
      distanceField: 'distance',
      distanceMultiplier: multiplier,
       spherical: true,
      key: 'startLocation' // 👈 IMPORTANT (now referencing the whole field)
    }
  },
  {
    $project: {
      name: 1,
      distance: 1,
      price: 1
    }
  }
]);
 res.status(200).json({
    status: 'success',
    data: distances
  });
})

// ============================================================================
// SUMMARY - WHAT THIS FUNCTION DOES
// ============================================================================
 
/**
 * INPUT:
 * URL: /tours-within/100/center/48.8566,2.3522/unit/km
 * 
 * PROCESSING:
 * 1. Extract: distance=100, lat=48.8566, lng=2.3522, unit=km
 * 2. Convert 100km to radians: 0.0157
 * 3. Query MongoDB for tours within this circle
 * 4. Collect results
 * 
 * OUTPUT:
 * JSON response with all found tours
 * 
 * RESULT:
 * "Show me all tours starting within 100km of Paris"
 * → Returns list of tours in Brussels, Amsterdam, etc.
 */