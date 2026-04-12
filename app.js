const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');
const cookieParser = require('cookie-parser');
const bookingController = require('./controllers/bookingController');
// Custom
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

// Routers
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRoutes = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');




const app = express();


app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
/* ================================
   DATABASE CONFIG
================================ */
mongoose.set('strictQuery', true);

/* ================================
   GLOBAL SECURITY MIDDLEWARES
================================ */
// Serve static files securely
app.use(express.static(path.join(__dirname, 'public')));

// Set secure HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://js.stripe.com",        // ← Stripe.js
        ],

        frameSrc: [
          "'self'",
          "https://js.stripe.com",        // ← Stripe's payment iframe
          "https://hooks.stripe.com",     // ← Stripe's webhook iframe
        ],

        connectSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://api.stripe.com",       // ← Stripe API calls
          "ws://localhost:*",
        ],
      },
    },
  })
);

// Enable CORS (configure origin in production)
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, try again in 1 hour.'
});
app.use('/api', limiter);

app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);
// Body parser (limit payload size)
app.use(express.json({ limit: '10kb' })); //parse data from body
// Middleware to parse cookies
app.use(cookieParser()); //parse data from cookies

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent HTTP parameter pollution
app.use(
  hpp({
    whitelist: ['duration', 'ratingsQuantity', 'price']
  })
);



/* ================================
   ROUTES
================================ */
app.use('/', viewRoutes);  // Views
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

/* ================================
   HANDLE UNDEFINED ROUTES
================================ */

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl}`, 404));
});

/* ================================
   GLOBAL ERROR HANDLER
================================ */

app.use(globalErrorHandler);

module.exports = app;