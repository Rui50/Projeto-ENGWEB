var News = require('../models/news')

module.exports.list = () => {
    return News
        .find()
        .sort({ date : -1 })
        .exec()
}

module.exports.findById = id => {
    return News
        .findOne({ _id: id })
        .exec()
}

module.exports.insert = n => {
    var newNews = new News(n)
    return newNews.save()
}