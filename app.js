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

// Controllers
const bookingController = require('./controllers/bookingController');
const globalErrorHandler = require('./controllers/errorController');

// Utils
const AppError = require('./utils/appError');

// Routes
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRoutes = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

const app = express();

/* ================================
   VIEW ENGINE
================================ */
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

/* ================================
   DATABASE CONFIG
================================ */
mongoose.set('strictQuery', true);

/* ================================
   SECURITY HEADERS (Helmet)
================================ */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://js.stripe.com",
        ],
        frameSrc: [
          "'self'",
          "https://js.stripe.com",
          "https://hooks.stripe.com",
        ],
        connectSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://api.stripe.com",
          "ws://localhost:*",
          "https://your-railway-app.up.railway.app",

        ],
      },
    },
  })
);

/* ================================
   CORS CONFIG
================================ */
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://natours-next-iota.vercel.app',
      'https://natours-production-b3f7.up.railway.app',
    ],
    credentials: true,
  })
);

app.options('*', cors()); // 🔥 REQUIRED

/* ================================
   GLOBAL MIDDLEWARES
================================ */

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));


// ✅ Add this line right after
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Logging (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Stripe webhook (MUST be before JSON parser)
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Data sanitization
app.use(mongoSanitize());
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: ['duration', 'ratingsQuantity', 'price'],
  })
);

// Rate limiting
const limiter = rateLimit({
  max: 1000,
  windowMs: 60 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, try again in 1 hour.',
});

app.use('/api', limiter);

/* ================================
   ROUTES
================================ */
app.use('/', viewRoutes);
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