const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require('crypto');
const validator = require("validator");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide your name"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"],
  },
  photo: {
    type: String,
    default: "default.jpg",
  },
  role:{
    type:String,
    enum:['user','guide','lead-guide','admin'],
    default:'user'
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 6,
    select: false, // Hide password from queries
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      // Only works on CREATE and SAVE
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords are not the same",
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type:Boolean,
    default: true,
    select:false
  }
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  // if password not modified next || isModified("password") → checks if the password field was changed
  // Without this check, your password would be hashed every time you save the user.
  // only run when password modify
  if (!this.isModified("password")) return ;

  this.password = await bcrypt.hash(this.password, 12);

  // Remove passwordConfirm field
  this.passwordConfirm = undefined;

   if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }
//  🧠 Why Date.now() - 1000 ?

});

// Compare password method
userSchema.methods.correctPassword = async function (
  candidatePassword
) {
  return await bcrypt.compare(candidatePassword, this.password);
}

userSchema.methods.changePasswordAfter = function(JWTTimestamp) {
  
  //console.log("Checking passwordChangedAt:", this.passwordChangedAt);

  if (!this.passwordChangedAt) return false; // password never changed

  const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
  //console.log("Password changed at (seconds):", changedTimestamp, "JWT iat:", JWTTimestamp);

  return JWTTimestamp < changedTimestamp; // true if password changed after JWT
}
//false mean not change

userSchema.methods.createPasswordResetToken = function () {
  // 1️⃣ Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  //console.log(resetToken)
  // 2️⃣ Hash token and store in DB
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // 3️⃣ Set expiration time
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  // 4️⃣ Return plain token (to send via email)
  return resetToken;
};

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
});

module.exports = mongoose.model("User", userSchema);

// ✅ candidatePassword
// This is the password the user just typed during login.
// Example:
// password from req.body
// ✅ this.password for current document
// This is the hashed password stored in the database.
// Example:
// user.password