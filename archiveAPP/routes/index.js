var express = require('express');
var router = express.Router();
var axios = require('axios');

var fs = require('fs');
var multer = require('multer');
var upload = multer({dest: 'uploads'});

var jwt = require('jsonwebtoken');

var env = require('../config/env')

function verifyToken(req, res, next){
  if(req.cookies && req.cookies.token){
    jwt.verify(req.cookies.token, 'ew2024', function(err, payload){
      if(err){
        res.status(401).jsonp({error: 'Token inválido!'});
      }
      else{
        req.user = payload;
        next();
      }
    });
  }
  else{
    res.status(401).jsonp({error: 'Token inexistente!'});
  }
}

/**
 * @ gets
 */

// GET / - Pagina de noticias
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// GET /register - Pagina de registo
router.get('/register', function(req, res, next) {
  var data = new Date().toISOString().substring(0,19)
  res.render('register', {data: data});
});

// GET /login - Pagina de login
router.get('/login', function(req, res, next) {
  var data = new Date().toISOString().substring(0,19)
  res.render('login', {data: data});
});

router.post('/login', function(req, res, next) {
  var date = new Date().toISOString().substring(0,19)
  axios.post('http://localhost:5002/users/login', req.body)
    .then(dados => {
      res.cookie('token', token, { httpOnly: true });
      res.redirect('/recursos')
    })
    .catch(erro => {
      res.render('error', {error: erro})
    })
});

// GET /logout - Pagina de logout
router.get('/logout', function(req, res, next) {
  res.clearCookie('token')
  res.redirect('/')
});

// GET /news - Pagina de noticias
router.get('/news',  function(req, res, next) {
  var date = new Date().toISOString().substring(0,19)

  axios.get('http://localhost:5001/news')
    .then(dados => {
      res.render('news', {newsList: dados.data, d: date});
    })
    .catch(erro => {
      res.render('error', {error: erro})
    })
});

// GET /profile - Pagina de perfil
router.get('/profile', verifyToken, function(req, res, next) {

  Promise.all([
    axios.get('http://localhost:5002/users/' + req.user.username+ "?token=" + req.cookies.token),
    axios.get('http://localhost:5001/resources?author=' + req.user.username)
  ])
  .then(([userData, resourcesData]) => {
    res.render('profile', { user: userData.data, resources: resourcesData.data });
  })
  .catch(error => {
    res.render('error', { error: error });
  });
});

router.post('/register', (req, res) => {
  axios.post(`${env.authAccessPoint}/users/register`, req.body)
    .then(response => {
      axios.get(`${env.authAccessPoint}/users/checkuser/${req.body.username}`)
        .then(userCheckResponse => {
          const userExists = userCheckResponse.data.username;
          if (userExists) {
            const token = response.data.token;
            
            res.cookie('token', token, { httpOnly: true });

            res.render('registerCompleted');
          } else {
            res.render('error', { error: { message: 'User does not exist' } });
          }
        })
        .catch(checkError => {
          res.render('error', { error: checkError });
        });
    })
    .catch(registerError => {
      res.render('error', { error: registerError });
    });
});




module.exports = router;
