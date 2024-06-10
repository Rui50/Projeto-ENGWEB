var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var passport = require('passport');
var userModel = require('../models/user');
var User = require('../controllers/user');

var auth = require('../auth/auth');

router.get('/', auth.verificaAcesso ,function(req, res, next) {
  User.list()
    .then(dados => res.jsonp(dados))
    .catch(erro => res.status(500).jsonp(erro))
});

router.post('/register'/*, auth.verificaAcesso*/, function (req, res, next) {
  var date = new Date().toISOString().substring(0, 19);

  console.log("Registration request body:", req.body);

  userModel.register(new userModel({
      username: req.body.username,
      name: req.body.name,
      email: req.body.email,
      affiliation: req.body.affiliation,
      level: req.body.level,
      registrationDate: date,
      lastAccess: date
  }), req.body.password,

      function (err, account) {
          if (err) {
              console.error("Error registering user:", err);
              return res.status(500).jsonp({ error: err });
          }

          jwt.sign({
              username: req.body.username,
              level: req.body.level
          }, "ew2024", { expiresIn: 300 }, function (e, token) {
              if (e) {
                  console.error("Error generating token:", e);
                  return res.status(401).jsonp({ error: e });
              } else {
                  console.log("Token generated:", token);
                  return res.status(200).jsonp({ status: 'Registration Successful!', token: token });
              }
          });
      });
});

router.post('/login', auth.verificaAcesso ,function(req, res, next) {
  var date = new Date().toISOString().substring(0,19)
  User.getUser(req.body.username)
    .then(user => {
      User.loginUser(req.body.username, date)
        .then(user => {
          jwt.sign({
            username: req.body.username, level: user.level}, 
            // sub: 'aula de EngWeb2024'},
            "ew2024", 
            {expiresIn: 3600}, 
            function(e, token){
  
            if(e){
              res.status(401).jsonp({error: "Erro na geracao do token! "+ e})
            }
            else{
              res.status(200).jsonp({token: token})
            }
          })
        })
        .catch(erro => res.status(500).jsonp(erro))
    })
    .catch(erro => res.status(500).jsonp(erro))
});

router.get('/checkuser/:id' ,function(req, res, next) {
  User.getUser(req.params.id)
  .then(user => {
    const userData = {
      username: user.username,
    };
    res.jsonp(userData);
  })
  .catch(error => res.status(500).jsonp(error));
});

router.get('/:id', auth.verificaAcesso ,function(req, res, next) {
  User.getUser(req.params.id)
    .then(dados => res.jsonp(dados))
    .catch(erro => res.status(500).jsonp(erro))
});


module.exports = router;
