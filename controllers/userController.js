const  multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const filterObj = require('../utils/filterObj');
const factory = require('./handlerFactory');

// 1) Configure where and how files are stored
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users'); // folder to save files
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });
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
exports.uploadUserPhoto = upload.single('photo'); // 'photo' must match input name in form

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next(); // no file uploaded

  // Create a filename
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  // Resize and convert to JPEG
  await sharp(req.file.buffer)
    .resize(500, 500)           // 500x500 px
    .toFormat('jpeg')
    .jpeg({ quality: 90 })      // optional: 90% quality
    .toFile(`public/img/users/${req.file.filename}`); // save to disk

  next();
});

exports.updateMe = catchAsync(async (req, res, next) => {

  // 1️⃣ Block password updates
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  // 2️⃣ Filter allowed fields
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename; // save uploaded photo

  // 3️⃣ Update user safely
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedUser) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});
exports.deleteMe = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.user.id,{ active: false });
  res.status(204).json({
    status: 'success',
    data: null
  });
})
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User
    .findById(req.user.id)
    // .populate('bookings')
    //.populate('reviews');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});
//exports.createUser = factory.createOne(User);
exports.createUser = (req,res)=> {
  res.status(500).json({
    status:'error',
    message: 'this route not defined!, please use /signUp '
  })
}
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
// exports.getUser = (req,res) => {
//     res.status(500).json({
//         status:'error',
//         message: 'This route is not yet defined!'
//     })
// }
// exports.createUser = (req,res) => {
//     res.status(500).json({
//         status:'error',
//         message: 'This route is not yet defined!'
//     })
// }
// exports.updateUser = (req,res) => {
//     res.status(500).json({
//         status:'error',
//         message: 'This route is not yet defined!'
//     })
// }
// exports.deleteUser = (req,res) => {
//     res.status(500).json({
//         status:'error',
//         message: 'This route is not yet defined!'
//     })
// }
// exports.getAllUsers = catchAsync(async (req,res,next) => {
//     const users = await User.find();
//     res.status(200).json({
//         status:'success',
//         results:users.length,
//         data:{
//             users
//         }
//     })
// });