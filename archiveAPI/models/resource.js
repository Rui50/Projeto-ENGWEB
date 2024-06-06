const { v4: uuidv4 } = require('uuid');

var mongoose = require('mongoose');

var resourceSchema = new mongoose.Schema({
    _id: { type: String, default: uuidv4 },
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
    files : [String],
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