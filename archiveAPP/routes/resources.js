var express = require('express');
var router = express.Router();
var axios = require('axios');

var fs = require('fs');
var multer = require('multer');
const { v4: uuidv4 } = require('uuid');
var upload = multer({dest: 'archive'});
const StreamZip = require('node-stream-zip');
const path = require('path');

var env = require('../config/env')

function verificaToken(req, res, next){
    if(req.cookies && req.cookies.token){
      jwt.verify(req.cookies.token, "ew2024", function(e, payload){
        if(e){
          res.render('error', {error: "O token do pedido não é válido...", token: false})
        }
        else{ 
          req.user = payload
          next()
        }
      })
    }else{
      res.render('error', {error: "O pedido não tem um token...", token: false})
    }
  }
  

router.get('/', function(req, res, next) {
    const date = new Date().toISOString().substring(0, 19);
    
    axios.get('http://localhost:5001/resources')
      .then(dados => {
        const resources = dados.data.map(resource => {
          const rankings = resource.rankings || [];
          const totalStars = rankings.reduce((sum, ranking) => sum + ranking.stars, 0);
          const averageRating = rankings.length > 0 ? (totalStars / rankings.length).toFixed(1) : 'No ratings';
          console.log('Average rating:', averageRating)
          return {
            ...resource,
            averageRating: averageRating
          };
        });
        res.render('resourcesPage', { resourceList: resources, d: date });
      })
      .catch(erro => {
        res.render('error', { error: erro });
      });
  });

router.get('/add', function(req, res, next) {
  var data = new Date().toISOString().substring(0,19)
  res.render('uploadResource', {/*u: req.user,*/data: data});
});

router.get('/rankings', function(req, res, next) {
    axios.get('http://localhost:5001/resources/rankings')
        .then(dados => {
            res.render('rankings', {rankingList: dados.data});
        })
        .catch(erro => {
            res.render('error', {error: erro})
        })
});

router.get('/comments/:id', function(req, res, next) {
    axios.get(`http://localhost:5001/resources/${req.params.id}`)
        .then(response => {
            const resource = response.data;
            res.render('comments', { resource: resource });
        })
        .catch(error => {
            res.render('error', { error: error });
        });
});


router.get('/edit-resource/:id', function(req, res, next) {
    var id = req.params.id;
    var resource;
    
    axios.get(`http://localhost:5001/resources/${id}`)
        .then(resourceResponse => {
            resource = resourceResponse.data;
            res.render('editresource', {resource: resource});
        })
        .catch(error => {
            res.render('error', {error: error});
        });
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

router.post('/upload', upload.single('resource'), function (req, res, next) {
    let errors = [];
    let resource = {
        _id: uuidv4(),
        content: [],
        files: [],
        manifest: { exists: true, valid: true },
        metadata: { exists: true, valid: true }
    };

    if (req.file && (req.file.mimetype === 'application/zip' || req.file.mimetype === "application/x-zip-compressed")) {
        const zip = new StreamZip({ 
            file: req.file.path, 
            storeEntries: true 
        });

        zip.on("error", function (err) {
            console.error(err);
            errors.push('Error processing zip file');
            cleanupAndRespond();
        });

        zip.on("ready", function () {
            const zipFileNames = Object.keys(zip.entries());
    
            const manifestEntryName = Object.keys(zip.entries()).find(name => name.endsWith("/manifest.txt"));
            const metadataEntryName = Object.keys(zip.entries()).find(name => name.endsWith("/resource-data.json"));

            if (manifestEntryName) {
                const manifest = zip.entryDataSync(manifestEntryName).toString('utf8');
                const filesInManifest = manifest.split('\n').map(file => file.trim());

                console.log('Files in manifest:', filesInManifest);
                console.log('Files in zip:', zipFileNames);
                
                const manifestDirectory = manifestEntryName.substring(0, manifestEntryName.lastIndexOf("/") + 1);
                for (const file of filesInManifest) {
                    const filePathInZip = `${manifestDirectory}${file}`;
                    if (!zipFileNames.includes(filePathInZip)) {
                        errors.push(`File ${file} not found in zip`);
                        resource.manifest.valid = false;
                    }
                }
            } else {
                resource.manifest.exists = false;
                errors.push("Manifest file not found");
            }
        
            if (metadataEntryName) {
                const metadata = zip.entryDataSync(metadataEntryName).toString('utf8');
                try {
                    const metadataObject = JSON.parse(metadata);
            
                    const requiredFields = ["title", "author", "creationDate", "type", "visibility", "tags", "year"];
                    for (const field of requiredFields) {
                        if (!metadataObject.hasOwnProperty(field)) {
                            resource.metadata.valid = false;
                            errors.push(`Missing required metadata field: ${field}`);
                        }
                    }
            
                    if (!['public', 'private'].includes(metadataObject.visibility)) {
                        resource.metadata.valid = false;
                        errors.push("Invalid visibility");
                    }
            
                    req.body.metadata = metadataObject;

                    if (!Array.isArray(metadataObject.tags)) {
                        resource.metadata.valid = false;
                        errors.push("Tags field must be an array");
                    }
                } catch (e) {
                    errors.push("Invalid metadata format");
                    resource.metadata.valid = false;
                }
            } else {
                resource.metadata.exists = false;
                errors.push("Metadata file not found");
            }
            if (errors.length > 0) {
                cleanupAndRespond();
            } else {
                const metadataObject = req.body.metadata;

                const resourceData = {
                    _id: resource._id,
                    type: metadataObject.type,
                    title: metadataObject.title,
                    subtitle: metadataObject.subtitle,
                    year: metadataObject.year,
                    creationDate: metadataObject.creationDate,
                    registrationDate: new Date(),
                    author: metadataObject.author,
                    visibility: metadataObject.visibility,
                    tags: metadataObject.tags || [],
                    comments: [],
                    rankings: []
                };

                const oldPath = path.join(__dirname, '..', req.file.path);
                const originalFileName = req.file.originalname;
                //const newFileName = `${resource._id}-${originalFileName}`;
                const newFileName = `${resource._id}.zip`;
                const newPath = path.join(__dirname, '..', 'archive', metadataObject.type, newFileName);
                

                const newDir = path.dirname(newPath);
                if (!fs.existsSync(newDir)) {
                    fs.mkdirSync(newDir, { recursive: true });
                }

                fs.rename(oldPath, newPath, function (err) {
                    if (err) {
                        console.error(err);
                        errors.push('Error moving file to archive');
                        cleanupAndRespond();
                    } else {
                        console.log('Sending resource data:', resourceData);

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
                                errors.push('Error adding resource to database');
                                cleanupAndRespond();
                            });
                    }
                });
            }
        });

    } else {
        errors.push("Resource submitted is not a zip file");
        cleanupAndRespond();
    }

    function cleanupAndRespond(archivePath = null) {
        const filePath = archivePath ? archivePath : path.resolve(__dirname, '..', req.file.path);
        try {
            fs.unlinkSync(filePath);
        } catch (e) {
            console.error('Error cleaning up file:', e);
        }
        res.render('uploadResource', { errors });
    }
});



router.post('/comment/:id', function(req, res, next) {
    console.log('Received comment data:', req.body)
    var id = req.params.id;
    var comment = {
        content: req.body.content,
        user: req.body.user,
    };

    axios.post(`http://localhost:5001/resources/comments/${id}`, comment)
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

    axios.post(`http://localhost:5001/resources/ratings/${id}`, ranking)
        .then(response => {
            res.redirect(`/resources/${id}`);
        })
        .catch(error => {
            console.error('Error adding ranking:', error);
            res.render('error', { error: error });
        });
});

router.post('/edit/:id', function(req, res, next) {
    var id = req.params.id;
    var resourceData = {
        type: req.body.type,
        title: req.body.title,
        subtitle: req.body.subtitle,
        year: parseInt(req.body.year),
        creationDate: req.body.creationDate,
        author: req.body.author,
        visibility: req.body.visibility
    };

    axios.put(`http://localhost:5001/resources/${id}`, resourceData)
        .then(response => {
            res.redirect(`/resources/${id}`);
        })
        .catch(error => {
            console.error('Error editing resource:', error);
            res.render('error', { error: error });
        });
});

router.post('/search', function(req, res, next) {
    console.log('Search request received:', req.body); 
    if(req.body.search == ""){
        axios.get('http://localhost:5001/resources')
            .then(dados => {
                console.log('Received data from API:', dados.data);
                res.render('resourcesPage', {resourceList: dados.data});
            })
            .catch(erro => {
                console.error('Error fetching data from API:', erro);
                res.render('error', {error: erro})
            })
    } else {
        axios.post('http://localhost:5001/resources/search', req.body)
            .then(dados => {
                console.log('Received data from API:', dados.data);
                res.render('resourcesPage', {resourceList: dados.data});
            })
            .catch(erro => {
                console.error('Error fetching data from API:', erro);
                res.render('error', {error: erro})
            })
    }
});

router.get('/download/:id', function(req, res, next) {
    var id = req.params.id;
    // quando tiver users e perms a dar vou ter de verificar se o user tem permissões para fazer download
    axios.get(`http://localhost:5001/resources/${id}`)
        .then(response => {
            const resource = response.data;
            console.log('Resource:', resource)
            const resourcePath = __dirname + '/../archive/' + resource.type + '/' + resource._id + '.zip';
            res.download(resourcePath);
        })
        .catch(error => {
            console.error('Error fetching resource:', error);
            res.render('error', { error: error });
        });
});


router.get('/:id', function(req, res, next) {
    var date = new Date().toISOString().substring(0, 19);
    var id = req.params.id;
    var resource;

    axios.get(`http://localhost:5001/resources/${id}`)
        .then(resourceResponse => {
            resource = resourceResponse.data;

            const rankings = resource.rankings || [];
            const totalStars = rankings.reduce((sum, ranking) => sum + ranking.stars, 0);
            const averageRating = rankings.length > 0 ? (totalStars / rankings.length).toFixed(1) : 'No ratings';
            console.log('Average rating:', averageRating);

            resource.averageRating = averageRating;

            var author = resource.author;
            return axios.get(`http://localhost:5001/resources?author=${author}`);
        })
        .then(authorResourcesResponse => {
            var authorResources = authorResourcesResponse.data;

            authorResources.forEach(resource => {
                const rankings = resource.rankings || [];
                const totalStars = rankings.reduce((sum, ranking) => sum + ranking.stars, 0);
                resource.averageRating = rankings.length > 0 ? (totalStars / rankings.length).toFixed(1) : 'No ratings';
            });

            res.render('resourcePage', { 
                resource: resource, 
                authorResources: authorResources, 
                resourceList: authorResources, 
                d: date 
            });
        })
        .catch(error => {
            res.render('error', { error: error });
        });
});


module.exports = router;
