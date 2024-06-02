var express = require('express');
var router = express.Router();
var Resources = require('../controllers/resource')
var News = require('../controllers/new')

/**
 * @api {get}
 */

// GET /resources - Devolve a lista de recursos
router.get('/', function(req, res, next) {
    Resources.list()
        .then(dados => res.jsonp(dados))
        .catch(erro => res.status(500).jsonp(erro))
});

// GET /resources/:id - Devolve a informação de um recurso
router.get('/:id', function(req, res, next) {
    Resources.findById(req.params.id)
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
router.post('/:id/comments', function(req, res, next) {
    var id = req.params.id;
    var comment = {
        content: req.body.content,
        user: req.body.user,
        postDate: new Date()
    };

    Resources.insertComment(id, comment)
        .then(dados => res.jsonp(dados))
        .catch(erro => res.status(500).jsonp(erro))
});

router.post('/:id/rankings', function(req, res, next) {
    var id = req.params.id;
    var ranking = {
        user: req.body.user,
        stars: req.body.stars
    };

    Resources.insertRanking(id, ranking)
        .then(dados => res.jsonp(dados))
        .catch(erro => res.status(500).jsonp(erro))
});


// POST /resources/:id/rankings - Insere um ranking num recurso
router.post('/:id/rankings', function(req, res, next) {
    Resources.findById(req.params.id)
        .then(resp => {
            var ranking = {
                user: req.body.user,
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
        .then(dados => res.jsonp(dados))
        .catch(erro => res.status(500).jsonp(erro))
});

module.exports = router;