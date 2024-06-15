var express = require('express');
var router = express.Router();
var axios = require('axios');

var jwt = require('jsonwebtoken');

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

  router.get('/', verifyToken, function(req, res, next) {
    if(req.user.level === 'admin'){
      axios.get('http://localhost:5002/users?token=' + req.cookies.token)
        .then(dados => {
          res.render('users', {users: dados.data});
        })
        .catch(erro => {
          res.render('error', {error: erro});
        });
    } else {
      res.status(403).send('Access denied');
    }
  });  

/* GET users listing. */
router.get('/:id', verifyToken, function(req, res, next) {

  if (req.user.level === 'admin') {
    axios.get('http://localhost:5002/users/' + req.user.username+ "?token=" + req.cookies.token)
      .then(response => {
          const userData = response.data;
          res.render('userData', {userData: userData}); 
      })
    }
  else {
    res.status(401).jsonp({error: 'Unauthorized!'});
  }
});

module.exports = router;
