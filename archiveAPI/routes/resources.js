var express = require('express');
var router = express.Router();
var Resources = require('../controllers/resource')
var News = require('../controllers/new');
const resource = require('../models/resource');

const fs = require('fs');
const StreamZip = require('node-stream-zip');
const multer = require('multer');
const upload = multer({ dest: 'archive/' });

/**
 * @api {get}
 */

// GET /resources - Devolve a lista de recursos
router.get('/', function(req, res, next) {
    Resources.list()
        .then(dados => res.jsonp(dados))
        .catch(erro => res.status(500).jsonp(erro))
});

// GET /resources/:author - Devolve a lista de recursos de um autor
router.get('author/:author', function(req, res, next) {
    Resources.findByAuthor(req.params.author)
        .then(dados => res.jsonp(dados))
        .catch(erro => res.status(500).jsonp(erro))
});

// GET /resources/:type - Devolve a lista de recursos de um tipo
router.get('type/:type', function(req, res, next) {
    Resources.findByType(req.params.type)
        .then(dados => res.jsonp(dados))
        .catch(erro => res.status(500).jsonp(erro))
});

router.get('/comments/:id', function(req, res, next) {
    Resources.findById(req.params.id)
        .then(dados => res.jsonp(dados))
        .catch(erro => res.status(500).jsonp(erro))
});

router.delete('/comments/:id/:commentID', function(req, res, next) {
    console.log('Received DELETE request for comment deletion');
    console.log('Resource ID:', req.params.id);
    console.log('Comment ID:', req.params.commentID);

    Resources.deleteComment(req.params.id, req.params.commentID)
        .then(dados => {
            console.log('Comment deleted successfully:', dados);
            res.jsonp(dados);
        })
        .catch(erro => {
            console.error('Error deleting comment:', erro);
            res.status(500).jsonp(erro);
        });
});

router.get('/ratings/:id', function(req, res, next) {
    Resources.getRankings(req.params.id)
        .then(dados => res.jsonp(dados))
        .catch(erro => res.status(500).jsonp(erro))
});

router.get('/rankings', function(req, res, next) {
    
    Resources.list()
        .then(resources => {

            const resourcesWithAverage = resources.map(resource => {
                
                if (!resource.rankings || resource.rankings.length === 0) {
                    return {
                        _id: resource._id,
                        title: resource.title,
                        averageStars: 0,
                        path: resource.path
                    };
                }

                const totalStars = resource.rankings.reduce((acc, curr) => {
                    return acc + curr.stars;
                }, 0);

                const averageStars = totalStars / resource.rankings.length;
                return {
                    _id: resource._id,
                    title: resource.title,
                    averageStars: averageStars,
                    path: resource.path
                };
            });

            const sortedResources = resourcesWithAverage.sort((a, b) => b.averageStars - a.averageStars);

            res.json(sortedResources);
        })
        .catch(err => {
            console.error('Error fetching and calculating rankings for resources:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});

router.post('/search', function(req, res, next) {
    console.log('Search request received:', req.body);

    let searchPromise;

    switch (req.body.filter) {
        case 'title':
            searchPromise = Resources.getByTitle(req.body.search);
            break;
        case 'author':
            searchPromise = Resources.SearchByAuthor(req.body.search);
            break;
        case 'type':
            searchPromise = Resources.SearchByType(req.body.search);
            break;
        case 'year':
            searchPromise = Resources.SearchByYear(req.body.search);
            break;
        case 'tag':
            searchPromise = Resources.SearchByTags(req.body.search);
            break;
        default:
            return res.status(400).json({ error: 'Invalid search filter' });
    }

    searchPromise
        .then(dados => res.json(dados))
        .catch(error => res.status(500).json({ error: error.message }));
});


// GET /resources/:id - Devolve a informação de um recurso
router.get('/:id', function(req, res, next) {
    Resources.findById(req.params.id)
        .then(dados => res.jsonp(dados))
        .catch(erro => res.status(500).jsonp(erro))
});

/**
 * @api {post}
 */

// POST /resources - Insere um recurso
router.post('/', function(req, res, next) {
    Resources.insert(req.body)
        .then(resource => {
            var newNews = {
                title: resource.title,
                content: 'New resource posted: ' + resource.title + ' by ' + resource.author,
                user: resource.author,
                date: resource.registrationDate,
                idResource: resource._id
            };
            return News.insert(newNews)
                .then(dados => res.jsonp(dados))
                .catch(erro => {
                    console.error("Error inserting news:", erro);
                    res.status(500).jsonp(erro);
                });
        })
        .catch(erro => {
            console.error("Error inserting resource:", erro);
            res.status(500).jsonp(erro);
        });
});

router.post('/upload', upload.single('resource'), function(req, res, next) {
    var date = new Date().toISOString().substring(0, 16);
    var errors = [];
    var resource = {
        content: [],
        allFiles: [],
        manifest: {
            exists: true,
            valid: true
        },
        metadata: {
            exists: true,
            valid: true
        }
    };

    if (req.file != undefined && (req.file.mimetype == 'application/zip' || req.file.mimetype == "application/x-zip-compressed")) {
        var zip = new StreamZip({
            file: req.file.path,
            storeEntries: true
        });

        zip.on("error", (err) => {
            res.render("error", { error: err });
        });

        zip.on('ready', () => {
            for (const entry of Object.values(zip.entries())) {
                resource.allFiles.push(entry.name);
                if (entry.name != "manifest.txt" && entry.name != "metadata.json") {
                    resource.content.push(entry.name);
                }
            }

            if (resource.content.length == 0) {
                errors.push("The resource does not contain content.");
            }

            if (resource.allFiles.includes("manifest.txt")) {
                let manifest = zip.entryDataSync("manifest.txt").toString('utf8').replace('\n', '');
                let files = manifest.split('|');
                for (let file of resource.content) {
                    if (!files.includes(file)) {
                        resource.manifest.valid = false;
                    }
                }

                if (!resource.manifest.valid) {
                    errors.push("The resource does not contain a valid manifest file.");
                }
            } else {
                resource.manifest.exists = false;
                errors.push("The resource does not contain a manifest file.");
            }

            let metadata;
            if (resource.allFiles.includes("metadata.json")) {
                let jsonFile = zip.entryDataSync("metadata.json").toString('utf8');
                metadata = JSON.parse(jsonFile);
                req.body.metadata = metadata;

                if (!(metadata.hasOwnProperty('title') && metadata.hasOwnProperty('type') && metadata.hasOwnProperty('dateCreation') && metadata.hasOwnProperty('visibility') && metadata.hasOwnProperty('author'))) {
                    resource.metadata.valid = false;
                }

                if (["Article", "Sheet", "Report", "Test", "Slides", "Thesis"].indexOf(metadata.type) === -1) {
                    resource.metadata.valid = false;
                }

                if (["Public", "Private"].indexOf(metadata.visibility) === -1) {
                    resource.metadata.valid = false;
                }

                if (!resource.metadata.valid) {
                    errors.push("The resource contains an invalid metadata file.");
                }
            } else {
                resource.metadata.exists = false;
                errors.push("The resource does not contain a metadata file.");
            }

            if (errors.length != 0) {
                let path = __dirname + '/../' + req.file.path;
                try {
                    fs.unlinkSync(path); // Remove invalid resource
                } catch (e) {
                    console.log(e);
                }
                res.render('addResourceForm', { errors: errors, date: date });
            } else {
                let data = zip.entryDataSync("metadata.json").toString('utf8');
                let metadataObj = JSON.parse(data);

                var newResource = {
                    resourceName: req.file.originalname,
                    files: resource.content,
                    title: metadataObj.title,
                    subtitle: metadataObj.subtitle,
                    type: metadataObj.type,
                    dateCreation: metadataObj.dateCreation,
                    dateSubmission: new Date().toISOString().slice(0, 19).split('T').join(' '),
                    visibility: metadataObj.visibility,
                    author: metadataObj.author,
                    submitter: req.user.username,
                    evaluation: {
                        ev: 0,
                        eved_by: []
                    }
                };

                let oldPath = __dirname + '/../' + req.file.path;
                let newPath = __dirname + '/../uploads/' + metadataObj.type + '/' + req.file.originalname;

                fs.rename(oldPath, newPath, erro => {
                    if (erro) res.render('error', { error: erro });
                    else {
                        axios.post('http://localhost:5001/resources', newResource)
                            .then(response => {
                                var newNews = {
                                    title: newResource.title,
                                    content: 'New resource posted: ' + newResource.title + ' by ' + newResource.author,
                                    user: newResource.author,
                                    date: newResource.dateSubmission,
                                };

                                axios.post('http://localhost:5001/news', newNews)
                                    .then(response => {
                                        res.redirect('/resources');
                                    })
                                    .catch(e => res.render('error', { error: e }));
                            })
                            .catch(error => res.render('error', { error: error }));
                    }
                });
            }
        });
    } else {
        errors.push("The resource is not a zip file!");
        res.render('addResourceForm', { errors: errors });
    }
});

// POST /resources/:id/comments - Insere um comentário num recurso
router.post('/comments/:id', function(req, res, next) {
    console.log('Received request to post comment');
    console.log('Request parameters:', req.params);
    console.log('Request body:', req.body);

    var id = req.params.id;
    var comment = {
        content: req.body.content,
        user: req.body.user,
        postDate: req.body.postDate,
        commentID: req.body.commentID 
    };

    console.log('Comment to be inserted:', comment);

    Resources.insertComment(id, comment)
        .then(dados => {
            console.log('Comment inserted successfully:', dados);
            res.jsonp(dados);
        })
        .catch(erro => {
            console.error('Error inserting comment:', erro);
            res.status(500).jsonp(erro);
        });
});


// POST /resources/:id/rankings - Insere um ranking num recurso
router.post('/ratings/:id', function(req, res, next) {
    Resources.findById(req.params.id)
        .then(resp => {
            var ranking = {
                user: req.body.username,
                stars: req.body.stars
            }   
            
            // se o user ja tiver feito "ranking", damos update, senao inserimos
            var newRank = true;

            // damos update? ou so pode fazer um ranking por user?
            for(var i = 0; i < resp.rankings.length; i++) {
                if(resp.rankings[i].user == ranking.user) {
                    newRank = false;
                }
            }

            if(newRank) { // insere ranking
                Resources.insertRanking(req.params.id, ranking)
                    .then(dados => res.jsonp(dados))
                    .catch(erro => res.status(500).jsonp(erro))
            } else { // atualiza ranking
                Resources.updateRanking(req.params.id, ranking)
                    .then(dados => res.jsonp(dados))
                    .catch(erro => res.status(500).jsonp(erro))
            }
        })
        .catch(erro => res.status(500).jsonp(erro))
});

/**
 * @api {put}
 */

// PUT /resources/:id - Atualiza um recurso
router.put('/:id', function(req, res, next) {
    Resources.update(req.params.id, req.body)
        .then(dados => res.jsonp(dados))
        .catch(erro => res.status(500).jsonp(erro))
});

/**
 * @api {delete}
 */

// DELETE /resources/:id - Apaga um recurso
router.delete('/:id', function(req, res, next) {
    Resources.remove(req.params.id)
        .then(resource => {
            if (!resource) {
                return res.status(404).json({ error: 'Resource not found' });
            }
            console.log(resource);
            res.jsonp(resource);
        })
        .catch(error => res.status(500).jsonp(error));
});

module.exports = router;