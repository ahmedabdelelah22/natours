const AppError = require('./appError');

class APIFeatures {
  // query => get from mongoose =>Tour.find()
  // queryString => get from express => /api/v1/tours?sort=price&limit=5&page=2

  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }
  filter() {
    //build query
    // 1A) filtering
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);
    //2B) advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    const mongoQuery = JSON.parse(queryStr);
    //let query = Tour.find(mongoQuery);
    this.query = this.query.find(mongoQuery);
    return this;
  }
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }
  async pagination() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

        // ✅ Count total documents for this query
  const totalDocs = await this.query.model.countDocuments(this.query.getQuery());
    //page=2&limit=10 1-10 page1, 11-20 page2 ,21-30 page3
    if (skip >= totalDocs) {
  throw new AppError('This page does not exist', 404);
}

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}
module.exports = APIFeatures;
