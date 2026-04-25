const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException',err => {
  console.log('uncaught Exception shutting down...')
  console.log(err.name,err.message);
  process.exit(1);
});

if (process.env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv');
  dotenv.config({ path: './config.env' });
}

const app = require('./app');
const DB = process.env.DATABASE.replace('<db_password>',process.env.DATABASE_PASSWORD)

// Use local MongoDB instead of Atlas
//const DB = process.env.DATABASE_LOCAL; // mongodb://localhost:27017/natours

mongoose.connect(DB)
  .then((con) => {
    console.log("MongoDB connected ✅");
  }).catch(err => console.error("MongoDB connection error ❌", err));
;

const port = process.env.PORT || 4000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection',err => {
  console.log('unhandle rejection shutting down...')
  console.log(err.name,err.message);
  server.close(()=>{
  process.exit(1);
  })
});