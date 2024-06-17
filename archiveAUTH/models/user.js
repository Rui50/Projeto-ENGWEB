const mongoose = require('mongoose')
var passportLocalMongoose = require('passport-local-mongoose');

var userSchema = new mongoose.Schema({
    username : String, // id
    name : String,
    email : String,
    password : String,
    level : String,
    registrationDate : Date,
    lastAccess : Date,
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('user', userSchema, 'users')