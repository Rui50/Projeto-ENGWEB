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

router.post('/register', function (req, res, next) {
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
          passport.authenticate('local')(req, res, function () {
            jwt.sign({
                username: req.body.username,
                level: req.body.level
            }, "ew2024", { expiresIn: 300 }, function (e, token) {
                if (e) {
                    console.error("Error generating token:", e);
                    return res.status(401).jsonp({ error: e });
                } else {
                    console.log("Token generated:", token);
                    // Send the token back to the client
                    return res.status(200).jsonp({ status: 'Registration Successful!', token: token });
                }
            });
          });
      });
});

router.post('/login', passport.authenticate('local'), function(req, res, next) {
  const date = new Date().toISOString().substring(0, 19);
  console.log('Login request received:', req.body);

  User.getUser(req.body.username)
    .then(user => {
      if (!user) {
        console.error('User not found:', req.body.username);
        return res.status(401).jsonp({ error: 'User not found' });
      }
      console.log('User found:', user);

      User.loginUser(req.body.username, date)
        .then(() => {
          console.log('User login updated:', req.body.username);
          
          jwt.sign(
            { username: req.body.username, level: user.level },
            "ew2024",
            { expiresIn: 3600 },
            (err, token) => {
              if (err) {
                console.error('Error generating token:', err);
                return res.status(500).jsonp({ error: "Error generating token! " + err });
              }
              console.log('Token generated:', token);
              res.status(200).jsonp({ token: token });
            }
          );
        })
        .catch(err => {
          console.error('Error updating login info:', err);
          res.status(500).jsonp(err);
        });
    })
    .catch(err => {
      console.error('Error retrieving user:', err);
      res.status(500).jsonp(err);
    });
});


module.exports = router;

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
