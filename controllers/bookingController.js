const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',

    success_url: `${req.protocol}://${req.get('host')}/my-tours`,
    cancel_url: `${req.protocol}://${req.get('host')}/tours/${tour.id}`,

    customer_email: req.user.email,
    client_reference_id: req.params.tourId,

    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: tour.price * 100, // Stripe expects cents
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [
              `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`
            ]
          }
        },
        quantity: 1
      }
    ]
  });

  // 3) Send session as response
  res.status(200).json({
    status: 'success',
    session
  });
});



// bookingController.js
exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) find all bookings for current user
  const bookings = await Booking.find({ user: req.user.id }).populate('tour');;

  // 2) get tour ids
  const tourIds = bookings.map(b => b.tour);

  // 3) find tours with those ids
  const tours = await Tour.find({ _id: { $in: tourIds } });

  res.status(200).json({
    status: 'success',
    data: {  tours }
  });
});

/* =========================================
   CREATE BOOKING FROM STRIPE WEBHOOK
========================================= */

const createBooking = async (session) => {
  try {
    console.log('💾 Creating booking...');

    await Booking.create({
      tour: session.client_reference_id,
      user: session.metadata.userId,
      price: session.amount_total / 100,
    });

    console.log('✅ Booking saved');
  } catch (err) {
    console.error('❌ Booking error:', err);
  }
};

exports.webhookCheckout = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log('🔥 Webhook received:', event.type);
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ONLY handle successful payment
  if (event.type === 'checkout.session.completed') {
    await createBooking(event.data.object);
  }

  res.status(200).json({ received: true });
};