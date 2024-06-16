var express = require('express');
var router = express.Router();
var axios = require('axios');

var fs = require('fs');
var multer = require('multer');
const { v4: uuidv4 } = require('uuid');
var upload = multer({dest: 'archive'});
const StreamZip = require('node-stream-zip');
const path = require('path');

var jwt = require('jsonwebtoken');
var env = require('../config/env')

function verifyToken(req, res, next) {
    if (req.cookies && req.cookies.token) {
        jwt.verify(req.cookies.token, 'ew2024', function (err, payload) {
            if (err) {
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
    const date = new Date().toISOString().substring(0, 19);

    axios.get('http://localhost:5001/resources')
        .then(dados => {
            
            const resources = dados.data
                .filter(resource => resource.visibility === 'public')
                .map(resource => {
                    const rankings = resource.rankings || [];
                    const totalStars = rankings.reduce((sum, ranking) => sum + ranking.stars, 0);
                    const averageRating = rankings.length > 0 ? (totalStars / rankings.length).toFixed(1) : 'No ratings';
                    console.log('Average rating:', averageRating)
                    return {
                        ...resource,
                        averageRating: averageRating
                    };
            });

            axios.get('http://localhost:5002/users/' + req.user.username + "?token=" + req.cookies.token)
                .then(userResponse => {
                    const userData = userResponse.data;
                    res.render('resourcesPage', { resourceList: resources, d: date, currentUser: userData });
                })
                .catch(error => {
                    res.render('error', { error: error });
                });
        })
        .catch(error => {
            res.render('error', { error: error });
        });
});

router.get('/add', verifyToken, function(req, res, next) {
  var data = new Date().toISOString().substring(0,19)
  res.render('uploadResource', {data: data, userLevel: req.user.level});
});

router.get('/rankings', verifyToken, function(req, res, next) {
    axios.get('http://localhost:5002/users/' + req.user.username + "?token=" + req.cookies.token)
        .then(userResponse => {
            const userData = userResponse.data;
            console.log('User data fetched successfully:', userData);

            axios.get('http://localhost:5001/resources/rankings')
                .then(rankingsResponse => {
                    const rankingList = rankingsResponse.data;
                    console.log('Rankings fetched successfully:', rankingList);

                    res.render('rankings', {
                        rankingList: rankingList,
                        user: userData 
                    });
                })
                .catch(rankingsError => {
                    console.error('Error fetching rankings:', rankingsError.response ? rankingsError.response.data : rankingsError.message);
                    res.render('error', { error: rankingsError });
                });
        })
        .catch(userError => {
            console.error('Error fetching user data:', userError.response ? userError.response.data : userError.message);
            res.render('error', { error: userError });
        });
});

router.get('/comments', verifyToken, function(req, res, next) {
    if (req.user.level === 'admin') {
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
                            resourceId: resource._id,
                            commentId: comment.commentID
                        })));
                    }
                });

                allComments.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

                res.render('allComments', { 
                    allComments: allComments,
                    userLevel: req.user.level
                });
            })
            .catch(error => {
                res.render('error', { error: error });
            });
    } else {
        res.render('error', { error: 'You do not have permission to access this page' });
    }
});

router.get('/comments/:id', verifyToken, function(req, res, next) {
    axios.get(`http://localhost:5001/resources/${req.params.id}`)
        .then(response => {
            const resource = response.data;
            res.render('comments', { resource: resource });
        })
        .catch(error => {
            res.render('error', { error: error });
        });
});


router.get('/edit-resource/:id', verifyToken, function(req, res, next) {
    var id = req.params.id;

    console.log(req.user.level);

    axios.get(`http://localhost:5001/resources/${id}`)
        .then(resourceResponse => {
            var resource = resourceResponse.data;

            if (req.user.username === resource.submitter || req.user.level === 'admin') {
                res.render('editresource', { resource: resource, userLevel: req.user.level });
            } else {
                res.render('error', { error: 'You do not have permission to edit this resource.' });
            }
        })
        .catch(error => {
            res.render('error', { error: error.message });
        });
});


router.post('/add', verifyToken, upload.single('file'), function (req, res, next) {
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

router.post('/upload', verifyToken, upload.single('resource'), function (req, res, next) {
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
                    submitter : req.user.username,
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
        res.render('uploadResource', { errors, userLevel: req.user.level });
    }
});

router.post('/comment/:id', verifyToken, function(req, res, next) {
    console.log('Received comment data:', req.body);
    var id = req.params.id;
    var comment = {
        content: req.body.content,
        user: req.user.username,
        postDate: new Date(),
        commentID: uuidv4(),
        id: req.params.id
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


router.post('/comment/delete/:id', verifyToken, function(req, res, next) {
    const resourceId = req.params.id;   
    const commentId = req.body.commentId;
    console.log('Deleting comment:', commentId, 'from resource:', resourceId)

    axios.delete(`http://localhost:5001/resources/comments/${resourceId}/${commentId}`)
        .then(response => {
            console.log('Comment deleted successfully:', response.data);
            res.redirect(`/resources/${resourceId}`);
        })
        .catch(error => {
            console.error('Error deleting comment:', error);
            res.render('error', { error: error });
        });
});



router.post('/rate/:id', verifyToken, function(req, res, next) {
    var id = req.params.id;
    var ranking = {
        stars: req.body.stars,
        user: req.user.username
    };

    console.log(ranking.user)

    axios.post(`http://localhost:5001/resources/ratings/${id}`, ranking)
        .then(response => {
            res.redirect(`/resources/${id}`);
        })
        .catch(error => {
            console.error('Error adding ranking:', error);
            res.render('error', { error: error });
        });
});

router.post('/edit/:id', verifyToken, function(req, res, next) {
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

router.post('/search', verifyToken, function(req, res, next) {
    console.log('Search request received:', req.body);

    axios.get('http://localhost:5002/users/' + req.user.username + "?token=" + req.cookies.token)
        .then(userResponse => {
            const userData = userResponse.data;
            console.log('User data fetched successfully:', userData);

            axios.post('http://localhost:5001/resources/search', req.body)
                .then(dados => {
                    console.log('Search results fetched successfully:', dados.data);
                    res.render('resourcesPage', { resourceList: dados.data, currentUser: userData });
                })
                .catch(error => {
                    console.error('Error searching resources:', error.response ? error.response.data : error.message);
                    res.render('error', { error: error });
                });
        })
        .catch(error => {
            console.error('Error fetching user data:', error.response ? error.response.data : error.message);
            res.render('error', { error: error });
        });
});


router.get('/download/:id', verifyToken, function(req, res, next) {
    var id = req.params.id;
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

router.post('/delete/:id', verifyToken, function(req, res, next) {
    axios.get('http://localhost:5002/users/' + req.user.username + "?token=" + req.cookies.token)
        .then(response => {
            const user = response.data;
            if (user.level === 'admin') {
                const id = req.params.id;

                axios.get(`http://localhost:5001/resources/${id}`)
                    .then(resourceResponse => {
                        const resource = resourceResponse.data;

                        axios.delete(`http://localhost:5001/resources/${id}`)
                            .then(deleteResponse => {
                                if (deleteResponse.data.deletedCount === 1) {
                                    const resourcePath = path.join(__dirname, '..', 'archive', resource.type, `${resource._id}.zip`);

                                    fs.unlink(resourcePath, (err) => {
                                        if (err) {
                                            console.error('Error deleting resource file:', err);
                                            return res.render('error', { error: err });
                                        }

                                        res.redirect('/profile');
                                    });
                                } else {
                                    console.error('Error: Resource was not deleted.');
                                    res.render('error', { error: 'Resource was not deleted' });
                                }
                            })
                            .catch(error => {
                                console.error('Error deleting resource:', error);
                                res.render('error', { error: error });
                            });
                    })
                    .catch(error => {
                        console.error('Error fetching resource:', error);
                        res.render('error', { error: error });
                    });
            } else {
                res.render('error', { error: 'You do not have permission to delete resources' });
            }
        })
        .catch(error => {
            console.error('Error fetching user:', error);
            res.render('error', { error: error });
        });
});


router.get('/:id', verifyToken, function(req, res, next) {
    var date = new Date().toISOString().substring(0, 19);
    var id = req.params.id;
    var resource;
    var user;

    axios.get('http://localhost:5002/users/' + req.user.username + "?token=" + req.cookies.token)
        .then(userResponse => {
            user = userResponse.data;
            return axios.get(`http://localhost:5001/resources/${id}`);
        })
        .then(resourceResponse => {
            resource = resourceResponse.data;

            const rankings = resource.rankings || [];
            const totalStars = rankings.reduce((sum, ranking) => sum + ranking.stars, 0);
            resource.averageRating = rankings.length > 0 ? (totalStars / rankings.length).toFixed(1) : 'No ratings';

            var author = resource.author;
            return axios.get(`http://localhost:5001/resources`);
        })
        .then(resourcesResponse => {
            var resources = resourcesResponse.data;

            var authorResources = resources.filter(r => r.author.includes(resource.author) && r._id !== id);

            authorResources.forEach(resource => {
                const rankings = resource.rankings || [];
                const totalStars = rankings.reduce((sum, ranking) => sum + ranking.stars, 0);
                resource.averageRating = rankings.length > 0 ? (totalStars / rankings.length).toFixed(1) : 'No ratings';
            });

            res.render('resourcePage', { 
                resource: resource, 
                authorResources: authorResources, 
                resourceList: authorResources, 
                user: user,
                d: date 
            });
        })
        .catch(error => {
            res.render('error', { error: error });
        });
});



module.exports = router;
