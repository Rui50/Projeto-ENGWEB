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
  console.log('Login request body:', req.body);
  axios.post('http://localhost:5002/users/login', req.body)
    .then(dados => {
      const token = dados.data.token;

      res.cookie('token', token, { httpOnly: true });
      res.redirect('/resources')
    })
    .catch(erro => {
      res.render('error', {error: erro})
    })
});

router.get('/adminpanel', verifyToken, function(req, res, next) {
  axios.get('http://localhost:5002/users/' + req.user.username + "?token=" + req.cookies.token)
      .then(userResponse => {
          const currentUser = userResponse.data;

          if (currentUser.level === 'admin') {
              axios.get('http://localhost:5002/users' + "?token=" + req.cookies.token)
                  .then(usersResponse => {
                      const users = usersResponse.data;

                      axios.get('http://localhost:5001/resources')
                          .then(resourcesResponse => {
                              const resources = resourcesResponse.data;

                              let allComments = [];
                              resources.forEach(resource => {
                                  if (resource.comments && Array.isArray(resource.comments)) {
                                      allComments.push(...resource.comments.map(comment => ({
                                          content: comment.content,
                                          user: comment.user,
                                          postDate: comment.postDate,
                                          resourceId: resource._id
                                      })));
                                  }
                              });

                              allComments.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

                              res.render('adminpanel', { userList: users, resourceList: resources, allComments: allComments, currentUser: currentUser });
                          })
                          .catch(error => {
                              res.render('error', { error: error });
                          });
                  })
                  .catch(error => {
                      res.render('error', { error: error });
                  });
          } else {
              res.render('error', { error: 'You do not have permission to access this page' });
          }
      })
      .catch(error => {
          res.render('error', { error: error });
      });
});


router.get('/logout', function(req, res, next) {
  res.clearCookie('token')
  res.redirect('/')
});

router.get('/news/add', verifyToken, function(req, res, next) {
  if (req.user.level == 'admin') {
    res.render('addNews'); 
  }
});

router.post('/news/add', function(req, res, next) {
  const { title, content, user, date, idResource } = req.body;

  const newsData = {
    title: req.body.title,
    content: req.body.content,
    user: req.user.username,
    date: new Date(), 
    idResource: req.body.idResource || null,
};

  axios.post('http://localhost:5001/news', newsData)
      .then(response => {
          console.log('News added successfully:', response.data);
          res.redirect('/news');
      })
      .catch(error => {
          console.error('Error adding news:', error);
          res.render('error', { error: error });
      });
});

// GET /news - Pagina de noticias
router.get('/news', verifyToken,  function(req, res, next) {
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
    axios.get('http://localhost:5001/resources?submitter=' + req.user.username)
  ])
  .then(([userData, resourcesData]) => {
    console.log(userData.data);  
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
