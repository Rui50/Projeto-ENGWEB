var express = require('express');
var router = express.Router();
var News = require('../controllers/new')

/**
 * News dos posts de recursos?
 * News de comentários? 
 * News de ratings?
 */


// GET /news - Devolve a lista de notícias
router.get('/', function(req, res, next) {
    News.list()
        .then(dados => res.jsonp(dados))
        .catch(erro => res.status(500).jsonp(erro))
});

// GET /news/:id - Devolve a informação de uma notícia
router.get('/:id', function(req, res, next) {
    News.findById(req.params.id)
        .then(dados => res.jsonp(dados))
        .catch(erro => res.status(500).jsonp(erro))
});

// POST /news - Insere uma notícia
router.post('/', function(req, res, next) {
    News.insert(req.body)
        .then(dados => res.jsonp(dados))
        .catch(erro => res.status(500).jsonp(erro))
});

module.exports = router;
