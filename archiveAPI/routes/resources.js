var express = require('express');
var router = express.Router();
var Resources = require('../controllers/resource')
var News = require('../controllers/new');
const resource = require('../models/resource');

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
                user: resource.submitter,
                date: resource.registrationDate,
                type: 'resource',
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



// POST /resources/:id/comments - Insere um comentário num recurso
router.post('/comments/:id', function(req, res, next) {
    var id = req.params.id;
    var comment = {
        content: req.body.content,
        user: req.body.user,
        postDate: req.body.postDate,
        commentID: req.body.commentID 
    };

    Resources.insertComment(id, comment)
        .then(dados => {
            var newNews = {
                title: 'New Comment Added',
                content: `User ${comment.user} added a comment to resource ${id}.`,
                user: comment.user,
                date: new Date(),
                type: 'comment',
                idResource: id
            };

            return News.insert(newNews);
        })
        .then(news => {
            res.jsonp(news); 
        })
        .catch(erro => {
            console.error('Error inserting comment or news:', erro);
            res.status(500).jsonp(erro);
        });
});


// POST /resources/:id/rankings - Insere um ranking num recurso
router.post('/ratings/:id', function(req, res, next) {
    var id = req.params.id;
    var ranking = {
        user: req.body.user,
        stars: req.body.stars
    };

    console.log(ranking.user)

    Resources.findById(id)
        .then(resource => {
            var newRanking = true;

            for (var i = 0; i < resource.rankings.length; i++) {
                if (resource.rankings[i].user === ranking.user) {
                    newRanking = false;
                    break;
                }
            }

            if (newRanking) {
                return Resources.insertRanking(id, ranking)
                    .then(dados => {
                        var newNews = {
                            title: 'New Ranking Added',
                            content: `User ${req.body.username} added a ranking to resource ${id}.`,
                            user: req.body.username,
                            date: new Date(),
                            type: 'rating',
                            idResource: id
                        };

                        return News.insert(newNews); 
                    });
            } else {
                return Resources.updateRanking(id, ranking)
                    .then(dados => {
                        var newNews = {
                            title: 'Ranking Updated',
                            content: `User ${req.body.username}'s ranking for resource ${id} has been updated.`,
                            user: req.body.username,
                            date: new Date(),
                            type: 'Ranking',
                            idResource: id
                        };

                        return News.insert(newNews); 
                    });
            }
        })
        .then(news => {
            res.jsonp(news);
        })
        .catch(erro => {
            console.error('Error inserting ranking or news:', erro);
            res.status(500).jsonp(erro);
        });
});

// PUT /resources/:id - Atualiza um recurso
router.put('/:id', function(req, res, next) {
    Resources.update(req.params.id, req.body)
        .then(dados => res.jsonp(dados))
        .catch(erro => res.status(500).jsonp(erro))
});

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