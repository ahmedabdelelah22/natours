const AppError = require('../utils/appError');

// 🔧 DB errors
const handleCastErrorDB = err => {
  return new AppError('Invalid ID format. Please use a valid ID.', 400);
};

const handleDuplicateFieldsDB = err => {
  const value = Object.values(err.keyValue)[0];
  const field = Object.keys(err.keyValue)[0];
  return new AppError(`Duplicate ${field}: ${value}`, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  return new AppError(`Invalid input data. ${errors.join('. ')}`, 400);
};

// 🔐 JWT errors
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

// ================= DEV =================
const sendErrorDev = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong',
    message: err.message,
    stack: err.stack
  });
};

// ================= PROD =================
const sendErrorProd = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }

    console.error('ERROR 💥', err);

    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }

  // RENDERED WEBSITE
  // operational , trusted error: send messaage to client
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong',
      message: err.message
    });
  }

  //programming , or other unknown err : don't leak error details
  console.error('ERROR 💥', err);

  return res.status(500).render('error', {
    title: 'Something went wrong',
    message: 'Please try again later.'
  });
};

// ================= GLOBAL =================
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = err ;


  // 🔧 Transform known errors
  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

  if (process.env.NODE_ENV === 'development') {
    return sendErrorDev(error, req, res);
  }

  if (process.env.NODE_ENV === 'production') {
    return sendErrorProd(error, req, res);
  }
};