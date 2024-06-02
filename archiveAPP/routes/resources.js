var express = require('express');
var router = express.Router();
var axios = require('axios');

var fs = require('fs');
var multer = require('multer');
var upload = multer({dest: 'uploads'});

router.get('/', function(req, res, next) {
  var date = new Date().toISOString().substring(0,19)

  axios.get('http://localhost:5001/resources')
    .then(dados => {
      res.render('resourcesPage', {resourceList: dados.data, d: date});
    })
    .catch(erro => {
      res.render('error', {error: erro})
    })
});

router.get('/:id', function(req, res, next) {
    var date = new Date().toISOString().substring(0,19);
    var id = req.params.id;
    var resource;

    axios.get(`http://localhost:5001/resources/${id}`)
        .then(resourceResponse => {
            resource = resourceResponse.data;
            
            // Fetch other resources by the same author
            var author = resource.author;
            return axios.get(`http://localhost:5001/resources?author=${author}`);
        })
        .then(authorResourcesResponse => {
            var authorResources = authorResourcesResponse.data;
            
            // Render the page with the resource and other resources by the same author
            res.render('resourcePage', { resource: resource, authorResources: authorResources, resourceList: authorResources, d: date });
        })
        .catch(error => {
            res.render('error', { error: error });
        });
});

router.get('/add', function(req, res, next) {
  var data = new Date().toISOString().substring(0,19)
  res.render('addresource', {/*u: req.user,*/data: data});
});

router.post('/add', upload.single('file'), function (req, res, next) {
    console.log('Received form data:', req.body);
  
    if (req.file) {
        console.log('Received file:', req.file);
    } else {
        console.log('No file uploaded');
    }

    const resourceData = {
        type: req.body.type,
        title: req.body.title,
        subtitle: req.body.subtitle,
        year: parseInt(req.body.year),
        creationDate: req.body.creationDate ? new Date(req.body.creationDate) : new Date(),
        registrationDate: new Date(),
        author: req.body.author,
        visibility: req.body.visibility,
        tags: req.body.tags ? req.body.tags.split(',') : [],
        path: req.file ? req.file.path : '',
        comments: [],
        rankings: []
    };
    

    console.log('Sending resource data:', resourceData)

    axios.post('http://localhost:5001/resources', resourceData)
        .then(response => {
            console.log('Resource added successfully:', response.data);
            res.redirect('/profile'); 
        })
        .catch(error => {
            console.error('Error adding resource:', error);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
            res.render('error', { error: error });
        });
});


router.post('comments/:id', function(req, res, next) {
    var id = req.params.id;
    var comment = {
        content: req.body.content,
        user: req.body.user,
    };

    axios.post(`http://localhost:5001/resources/${id}/comments`, comment)
        .then(response => {
            res.redirect(`/resources/${id}`);
        })
        .catch(error => {
            console.error('Error adding comment:', error);
            res.render('error', { error: error });
        });
});

router.post('/rate/:id', function(req, res, next) {
    var id = req.params.id;
    var ranking = {
        stars: req.body.stars,
        user: req.body.user
    };

    axios.post(`http://localhost:5001/resources/${id}/rankings`, ranking)
        .then(response => {
            res.redirect(`/resources/${id}`);
        })
        .catch(error => {
            console.error('Error adding ranking:', error);
            res.render('error', { error: error });
        });
});

module.exports = router;
