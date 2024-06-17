var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var resourcesRouter = require('./routes/resources');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/resources', resourcesRouter);
app.use('/profilePictures', express.static(path.join(__dirname, 'archive', 'profilePictures')));

app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  console.error(err.stack);

  res.status(err.status || 500);

  let redirectUrl = '/resources';
  if (err.message.includes('Token')) {
    redirectUrl = '/login';
  }

  // Render the error page
  res.render('error', {
    message: err.message,
    error: err,
    redirectUrl: redirectUrl,
    user: req.user
  });
});

module.exports = app;
