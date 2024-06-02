var mongoose = require('mongoose');

var newsSchema = new mongoose.Schema({
    title : String,
    content : String,
    user : String,
    date : Date,
});

module.exports = mongoose.model('News', newsSchema, 'news');