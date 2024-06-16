var express = require('express');
var router = express.Router();
var axios = require('axios');
var jwt = require('jsonwebtoken');

function verifyToken(req, res, next){
    if(req.cookies && req.cookies.token){
        jwt.verify(req.cookies.token, 'ew2024', function(err, payload){
            if(err){
                res.status(401).render('error', { 
                    error: { 
                        message: 'Invalid token!', 
                        redirect: 'login', 
                        stack: err.stack 
                    } 
                });
            } else {
                req.user = payload;
                next();
            }
        });
    } else {
        res.status(401).render('error', { 
            error: { 
                message: 'Token not found!', 
                redirect: 'login' 
            } 
        });
    }
}

router.get('/', verifyToken, function(req, res, next) {
    if(req.user.level === 'admin'){
        axios.get('http://localhost:5002/users?token=' + req.cookies.token)
            .then(dados => {
                res.render('users', { users: dados.data });
            })
            .catch(erro => {
                res.render('error', { 
                    error: { 
                        message: 'Error fetching users', 
                        stack: erro.stack, 
                        redirect: 'resources' 
                    } 
                });
            });
    } else {
        res.status(403).render('error', { 
            error: { 
                message: 'Access denied', 
                redirect: 'resources' 
            } 
        });
    }
});

router.get('/:id', verifyToken, function(req, res, next) {
    if (req.user.level === 'admin') {
        axios.get(`http://localhost:5002/users/${req.params.id}?token=${req.cookies.token}`)
            .then(userDataResponse => {
                const userData = userDataResponse.data;

                axios.get(`http://localhost:5001/resources/`)
                    .then(resourcesResponse => {
                        const resources = resourcesResponse.data;

                        const userResources = resources.filter(resource => resource.submitter === req.params.id);

                        let allComments = [];
                        let allRatings = [];

                        resources.forEach(resource => {
                            resource.comments.forEach(comment => {
                                if (comment.user === req.params.id) {
                                    allComments.push({
                                        resource: resource._id,
                                        commentId: comment.commentID,
                                        content: comment.content,
                                        date: comment.postDate,
                                        user: comment.user 
                                    });
                                }
                            });

                            resource.rankings.forEach(rating => {
                                if (rating.user === req.params.id) {
                                    allRatings.push({
                                        resource: resource._id,
                                        stars: rating.stars,
                                        date: rating.postDate,
                                        user: rating.user 
                                    });
                                }
                            });
                        });

                        const ratingsGiven = allRatings.length;
                        const commentsMade = allComments.length;
                        const resourcesAdded = userResources.length;

                        res.render('userData', {
                            userData: userData,
                            resources: userResources,
                            comments: allComments,
                            ratings: allRatings,
                            ratingsGiven: ratingsGiven,
                            commentsMade: commentsMade,
                            resourcesAdded: resourcesAdded
                        });
                    })
                    .catch(err => {
                        res.render('error', { 
                            error: { 
                                message: 'Error fetching resources', 
                                stack: err.stack, 
                                redirect: 'resources' 
                            } 
                        });
                    });
            })
            .catch(err => {
                res.render('error', { 
                    error: { 
                        message: 'Error fetching user data', 
                        stack: err.stack, 
                        redirect: 'resources' 
                    } 
                });
            });
    } else {
        res.status(401).render('error', { 
            error: { 
                message: 'Unauthorized!', 
                redirect: 'resources' 
            } 
        });
    }
});

module.exports = router;
