const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Email = require('../utils/email')

// 🔐 Use bcrypt When…
// ✅ 1. Storing User Passwords
// ✅ 2. Checking Login Password

// 🔑 Use crypto When…
// ✅ 1. Generating Random Tokens
// ✅ 2. Hashing Temporary Tokens
// ✅ 3. Encryption / Decryption

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: Number(process.env.JWT_EXPIRES_IN),
  });
}

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: true,
    //isProduction,
    sameSite:'none',
    // isProduction ? 'none' : 'lax',

    // ✅ IMPORTANT FIX
    maxAge: Number(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000,

    path: '/',
  });

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user },
  });
};


exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm, passwordChangedAt } =
    req.body;

  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    passwordChangedAt: passwordChangedAt
      ? new Date(passwordChangedAt)
      : undefined,
  });

  newUser.password = undefined;

  // ✅ 1. Send response immediately
  createSendToken(newUser, 201, res);

  // ✅ 2. Send email AFTER response (non-blocking)
  const url = `${req.protocol}://${req.get('host')}/account`;

  new Email(newUser, url)
    .sendWelcome()
    .then(() => {
      console.log('✅ Welcome email sent to:', newUser.email);
    })
    .catch((err) => {
      console.error('❌ Email failed:', err);
    });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // 1️⃣ Check if email & password exist
  if (!email || !password) {
    return next(new AppError('please provide email and password!', 400));
  }
  // 2️⃣ Check if user exists & correct password
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password))) {
    return next(new AppError('Incorrect email or password!', 401));
  }

  // 3️⃣ compare password
  // const isMatch = await bcrypt.compare(password, user.password);
  // if (!isMatch) {
  //  return next(new AppError('Invalid credentials!', 400));
  // }

  // 4️⃣ Create token
  // 5️⃣ Send response
  createSendToken(user,200,res);
  
});

exports.logout =catchAsync(async (req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  try {
    res.cookie('jwt', '', {
      httpOnly: true,
      expires: new Date(Date.now()),
      sameSite:'none',
      // isProduction ? 'none' : 'lax', // ← must match login cookie,
       secure:true,
       // isProduction,
    });

    // send response once
    return res.status(200).json({ status: 'success' });
  } catch (err) {
    next(err); // only send response here if try fails
  }
});
// exports.logout = catchAsync(async (req, res, next) => {

//   res.cookie('jwt', '', {
//     httpOnly: true,
//     expires: new Date(Date.now()),
//     secure: isProduction,
//     sameSite: isProduction ? 'none' : 'lax', // ← must match login cookie
//   });

//   return res.status(200).json({ status: 'success' });
// });



exports.protect = catchAsync(async (req, res, next) => {
  let token;

  // 1️⃣ Get token from header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt){
    token = req.cookies.jwt;
  }
  // 2️⃣ If no token
  if (!token) {
   //return next(new AppError('You are not logged in!', 401));
     return res.redirect('/login');

  }

  // 3️⃣ Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // 4️⃣ Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401),
    );
  }
  //check if user change password after the token was issued (created)
  if (currentUser.changePasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! please log in again', 401),
    );
  }
  // 5️⃣ Give access to protected route
  req.user = currentUser;
  next();
});

//only for rendered pages, no errors;
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (!req.cookies.jwt) return next(); // no token, just continue

  try {
    const decoded = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) return next();

    // Check if user changed password after token was issued
    if (currentUser.changePasswordAfter(decoded.iat)) return next();

    // User is logged in
    res.locals.user = currentUser;
    return next();
  } catch (err) {
    // Invalid token, expired, etc. -> just continue without user
    return next();
  }
});

// Headers tab →
// Key: Authorization
// Value: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission', 403));
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  // 1️⃣ Check if user exists
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }

  // 2️⃣ Generate password reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); 

  
  
  
  try {
    // 3️⃣ Create reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/api/users/resetPassword/${resetToken}`;
    // 5️⃣ Send email
    await new Email(user, resetUrl).sendPasswordReset();

    // 6️⃣ Respond to client
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });

  } catch (err) {
      console.log('EMAIL ERROR:', err); // ✅ add this

    // 7️⃣ If email fails, reset token and expire
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email. Try again later!', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res,next) => {
  const { password , passwordConfirm} = req.body;

  // 1️⃣ Hash the token from URL to match DB
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  // 2️⃣ Find user with token that hasn’t expired
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {return next(new AppError("Invalid or expired token",400))};

  // 3️⃣ set new password
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  // 4️⃣ Remove token & expiry fields
  user.resetToken = undefined;
  user.resetTokenExpire = undefined;

  // 5️⃣ Save user
  await user.save();

  createSendToken(user,200,res);


 
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1️⃣ Get user from DB (include password)
  const user = await User.findById(req.user._id).select('+password');

  // 2️⃣ Check if current password is correct
  const correct = await user.correctPassword(
    req.body.currentPassword,
    user.password
  );

  if (!correct) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3️⃣ Set new password
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.passwordConfirm;

  // 4️⃣ Save user (runs pre-save middleware)
  await user.save();
// 🔥 Why This Is Secure
// 1️We use save() not findByIdAndUpdate()
// Because:
// save() triggers your pre("save") middleware
// Password gets hashed
// passwordChangedAt gets updated
// Old JWTs become invalid
// If you use:
// User.findByIdAndUpdate()
// ⚠ Middleware WILL NOT RUN → insecure.

  // 5️⃣ Log user in, send new JWT
   createSendToken(user,200,res);

});
