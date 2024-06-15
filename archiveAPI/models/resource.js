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
    submitter : String,
    visibility : String,
    tags : [String],
    path : String,
    files : [String],
    comments : [{
        content : String,
        user : String,
        postDate : Date,
        id : String,
        commentID : String,
    }],
    rankings: [{
        user : String,
        stars : Number,
    }],
}, {versionKey: false});

module.exports = mongoose.model('Resource', resourceSchema, 'resources');