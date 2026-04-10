const fs = require('fs')
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('../../models/tourModel')
const User = require('../../models/userModel')
const Review = require('../../models/reviewModel')

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace('<db_password>',process.env.DATABASE_PASSWORD)
//const DB = process.env.DATABASE_LOCAL;
mongoose.connect(DB)
  .then((con) => {
    console.log("MongoDB connected ✅");
  }).catch(err => console.error("MongoDB connection error ❌", err));
;

// Read json file
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`,'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`,'utf-8'));
const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`,'utf-8'));

//import data into db
const importData = async () => {
    try{
      await Tour.create(tours);
      await User.create(users,{validateBeforeSave:false});
      await Review.create(reviews);

      console.log('Data successfully loaded!')
            process.exit();
    }catch(err){
      console.log(err)
    }
}

// Delete all data from DB
 const deleteData = async () => {
    try{
      await Tour.deleteMany();
      await User.deleteMany();
      await Review.deleteMany();

      console.log('Data successfully loaded!')
      process.exit();
    }catch(err){
      console.log(err)
    }
}

if (process.argv.includes('--import')) {
  importData();
} else if (process.argv.includes('--delete')) {
  deleteData();
}


// node dev-data/data/import-dev-data.js --import
// node dev-data/data/import-dev-data.js --delete
