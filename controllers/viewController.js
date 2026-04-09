const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');


exports.getOverview = catchAsync(async (req, res, next) => {
    // 1 ) get tour data 
  const tours = await Tour.find();

   // 1 ) render template using data 
  res.status(200).render('overview', {
    title: 'All Tours',
    tours
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id).populate({
    path:"reviews",
    fields:"rev"
  });

  // 🚨 handle not found
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(200).render('tour', {
    title: tour.name,
    tour
  });
});

exports.getLoginForm = catchAsync(async (req, res, next) => {
   

   // 1 ) render template using data 
  res.status(200).render('login', {
    title: 'Log into your account'
  });
});

// ================= GET ACCOUNT =================
exports.getAccount = catchAsync(async (req, res, next) => {
  // Render account page and pass current user
  res.status(200).render('account', {
    title: 'Your account',
    user: req.user // req.user comes from isLoggedIn middleware
  });
});

exports.getMyTours = catchAsync(async (req, res, next) => {
//  ❌ If you don’t use protect user=undefind
  // 1️⃣ Find all bookings for current user
  const bookings = await Booking.find({ user: req.user.id });

  // 2️⃣ Extract tour IDs
  const tourIDs = bookings.map(el => el.tour);

  // 3️⃣ Find tours with those IDs
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  // 4️⃣ Render overview page with booked tours
  res.status(200).render('overview', {
    title: 'My Tours',
    tours
  });
});