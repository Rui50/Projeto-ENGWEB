var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    username : String,
    name : String,
    email : String,
    password : String,
    affiliation : String,
    level : String,
    registrationDate : Date,
    lastAccess : Date,
});

module.exports = mongoose.model('User', userSchema, 'users');