var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var resourcesRouter = require('./routes/resources');
var newsRouter = require('./routes/news');

var app = express();

var mongoDB = 'mongodb://127.0.0.1/archive'

mongoose.connect(mongoDB)
var db = mongoose.connection
db.on("error", console.error.bind(console, "Erro de conexão"))
db.once("open", () =>{
  console.log("Conexão ao mongoDB realizada com sucesso")
})

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/resources', resourcesRouter);
app.use('/news', newsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});


app.use(function(req, res, next){
  var myToken = req.query.token || req.body.token
  if(myToken){
    console.log(myToken)
    jwt.verify(myToken, "ew2024", function(err, payload){
      if(err){
        res.status(401).jsonp({error: "Token inválido"})
      }else{
        req.user = payload 
        next()
      }
    })
  }
  else{
    res.status(401).jsonp({error: "Token inexistente"})
  }
})

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
