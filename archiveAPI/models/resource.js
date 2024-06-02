var mongoose = require('mongoose');

var resourceSchema = new mongoose.Schema({
    type : String,
    title : String,
    subtitle : String,
    year : Number,
    creationDate: Date,
    registrationDate: Date,
    author : String,
    visibility : String,
    tags : [String],
    path : String,
    comments : [{
        content : String,
        user : String,
        postDate : Date,
    }],
    rankings: [{
        user : String,
        stars : Number,
    }],
}, {versionKey: false});

module.exports = mongoose.model('Resource', resourceSchema, 'resources');