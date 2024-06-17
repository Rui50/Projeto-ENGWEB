var express = require('express');
var router = express.Router();
var axios = require('axios');
var fs = require('fs');
var multer = require('multer');
var upload = multer({ dest: 'archive' });
var jwt = require('jsonwebtoken');
var env = require('../config/env');

const path = require('path');
const JSZip = require('jszip');

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

// GET / - Homepage
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express' });
});

// GET /register - Registration page
router.get('/register', function (req, res, next) {
    var data = new Date().toISOString().substring(0, 19);
    res.render('register', { data: data });
});

// GET /login - Login page
router.get('/login', function (req, res, next) {
    var data = new Date().toISOString().substring(0, 19);
    res.render('login', { data: data });
});

// POST /login - Handle login
router.post('/login', function (req, res, next) {
    var date = new Date().toISOString().substring(0, 19);
    console.log('Login request body:', req.body);
    axios.post('http://localhost:5002/users/login', req.body)
        .then(dados => {
            const token = dados.data.token;
            res.cookie('token', token, { httpOnly: true });
            res.redirect('/resources');
        })
        .catch(erro => {
            res.render('error', { 
                error: { 
                    message: 'Error during login', 
                    stack: erro.stack, 
                    redirect: 'login' 
                } 
            });
        });
});

// GET /adminpanel - Admin panel
router.get('/adminpanel', verifyToken, function (req, res, next) {
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
                              res.render('adminpanel', { 
                                  userList: users, 
                                  resourceList: resources, 
                                  allComments: allComments, 
                                  currentUser: currentUser 
                              });
                          })
                          .catch(error => {
                              res.render('error', { 
                                  error: { 
                                      message: 'Error fetching resources', 
                                      stack: error.stack, 
                                      redirect: 'resources' 
                                  } 
                              });
                          });
                  })
                  .catch(error => {
                      res.render('error', { 
                          error: { 
                              message: 'Error fetching users', 
                              stack: error.stack, 
                              redirect: 'resources' 
                          } 
                      });
                  });
          } else {
              res.render('error', { 
                  error: { 
                      message: 'You do not have permission to access this page', 
                      redirect: 'resources' 
                  } 
              });
          }
      })
      .catch(error => {
          res.render('error', { 
              error: { 
                  message: 'Error fetching user data', 
                  stack: error.stack, 
                  redirect: 'resources' 
              } 
          });
      });
});


// GET /logout - Logout
router.get('/logout', function (req, res, next) {
    res.clearCookie('token');
    res.redirect('/');
});

// GET /news/add - Add news page (admin only)
router.get('/news/add', verifyToken, function (req, res, next) {
    if (req.user.level == 'admin') {
        res.render('addNews'); 
    }
});

// POST /news/add - Handle adding news (admin only)
router.post('/news/add', verifyToken, function (req, res, next) {
    const newsData = {
        title: req.body.title,
        content: req.body.content,
        user: req.user.username,
        date: new Date(), 
        type: 'admin',
        idResource: req.body.idResource || null,
    };
    axios.post('http://localhost:5001/news', newsData)
        .then(response => {
            console.log('News added successfully:', response.data);
            res.redirect('/news');
        })
        .catch(error => {
            console.error('Error adding news:', error);
            res.render('error', { 
                error: { 
                    message: 'Error adding news', 
                    stack: error.stack, 
                    redirect: 'resources' 
                } 
            });
        });
});

// GET /news - News page
router.get('/news', verifyToken, function (req, res, next) {
    var date = new Date().toISOString().substring(0, 19);
    var filter = req.query.newsType;
    axios.get('http://localhost:5001/news')
        .then(dados => {
            var filteredNewsList = dados.data.filter(news => {
                return !filter || filter === 'all' || news.type === filter;
            });
            res.render('news', {
                newsList: filteredNewsList,
                d: date,
                userLevel: req.user.level,
                newsType: filter
            });
        })
        .catch(erro => {
            res.render('error', { 
                error: { 
                    message: 'Error fetching news', 
                    stack: erro.stack, 
                    redirect: 'resources' 
                } 
            });
        });
});

// GET /profile - Profile page
router.get('/profile', verifyToken, function (req, res, next) {
    Promise.all([
        axios.get('http://localhost:5002/users/' + req.user.username + "?token=" + req.cookies.token),
        axios.get('http://localhost:5001/resources?submitter=' + req.user.username)
    ])
    .then(([userData, resourcesData]) => {
        let profilePicturePath = '/images/default_profile.png';

        const profilePictureDir = path.join(__dirname, '../archive/profilePictures');
        const profilePictureFormats = ['jpg', 'jpeg', 'png'];
        let found = false;
        let profilePictureFilename = '';

        for (let i = 0; i < profilePictureFormats.length && !found; i++) {
            const format = profilePictureFormats[i];
            const filename = `${req.user.username}.${format}`;
            if (fs.existsSync(path.join(profilePictureDir, filename))) {
                profilePictureFilename = filename;
                found = true;
            }
        }

        if (profilePictureFilename) {
            profilePicturePath = `/profilePictures/${profilePictureFilename}`;
        }

        console.log(profilePicturePath)

        res.render('profile', {
            user: userData.data,
            resources: resourcesData.data,
            profilePicture: profilePicturePath
        });
    })
    .catch(error => {
        res.render('error', { 
            error: { 
                message: 'Error fetching profile data', 
                stack: error.stack, 
                redirect: 'resources' 
            } 
        });
    });
});

// POST /register
router.post('/register', upload.single('profilePicture'), (req, res) => {
    const { username, name, email, password, confirm_password, level } = req.body;

    // Verifica todos os campos
    if (!username || !name || !email || !password || !confirm_password || !level) {
        return res.render('error', {
            error: {
                message: 'All fields are required',
                redirect: 'register'
            }
        });
    }

    // Verifica passwords
    if (password !== confirm_password) {
        return res.render('error', {
            error: {
                message: 'Passwords do not match',
                redirect: 'register'
            }
        });
    }

    const profilePicture = req.file;

    axios.post(`http://localhost:5002/users/check`, { username, email })
        .then(checkUserResponse => {
            if (checkUserResponse.data.exists) {
                const errorMessage = 'Username or email already exists';
                res.render('error', {
                    error: {
                        message: errorMessage,
                        redirect: 'register'
                    }
                });
            } else {
                // Se email / username unico
                axios.post(`http://localhost:5002/users/register`, {
                    username,
                    name,
                    email,
                    password,
                    level
                })
                .then(response => {
                    const token = response.data.token;
                    res.cookie('token', token, { httpOnly: true });

                    if (req.file) {
                        const oldPath = req.file.path;
                        const newDir = path.join(__dirname, '..', 'archive', 'profilePictures');
                        const newFileName = username + path.extname(req.file.originalname);
                        const newPath = path.join(newDir, newFileName);

                        if (!fs.existsSync(newDir)) {
                            fs.mkdirSync(newDir, { recursive: true });
                        }

                        fs.renameSync(oldPath, newPath);
                    }

                    res.render('registerCompleted');
                })
                .catch(registerError => {
                    console.error('Error during registration:', registerError);
                    res.render('error', {
                        error: {
                            message: 'Error during registration',
                            stack: registerError.stack,
                            redirect: 'register'
                        }
                    });
                });
            }
        })
        .catch(checkError => {
            console.error('Error checking user existence:', checkError);
            res.render('error', {
                error: {
                    message: 'Error checking user existence',
                    stack: checkError.stack,
                    redirect: 'register'
                }
            });
        });
});

function getCurrentDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
}

router.post('/admin/export', verifyToken, function (req, res, next) {

    if (req.user.level === 'admin'){
    let resourcesData, newsData, usersData;

    axios.get('http://localhost:5001/resources/')
        .then(response => {
            resourcesData = response.data;
            return axios.get('http://localhost:5001/news/');
        })
        .then(response => {
            newsData = response.data;
            return axios.get('http://localhost:5002/users/' + req.user.username + "?token=" + req.cookies.token);
        })
        .then(response => {
            usersData = response.data;

            const zip = new JSZip();
            zip.file('users.json', JSON.stringify(usersData, null, 2));
            zip.file('news.json', JSON.stringify(newsData, null, 2));

            const filePromises = [];

            resourcesData.forEach(resource => {
                const resourceFolder = zip.folder('resources/' + resource._id);
                resourceFolder.file('resource-data.json', JSON.stringify(resource, null, 2));

                const resourceFilesPath = path.join(__dirname, '..', 'archive', resource.type, resource._id + '.zip');
                if (fs.existsSync(resourceFilesPath)) {
                    filePromises.push(new Promise(function (resolve, reject) {
                        fs.readFile(resourceFilesPath, function (err, data) {
                            if (err) {
                                console.error(`Error reading file ${resourceFilesPath}:`, err);
                                reject(err);
                            } else {
                                resourceFolder.file(resource._id + '.zip', data);
                                resolve();
                            }
                        });
                    }));
                }
            });

            return Promise.all(filePromises).then(function () {
                return zip.generateAsync({ type: 'nodebuffer' });
            });
        })
        .then(function (zipContent) {
            const date = getCurrentDate();
            const filePath = path.join(__dirname, '..', `archive_${date}.zip`);
            fs.writeFile(filePath, zipContent, function (err) {
                if (err) {
                    console.error('Error writing ZIP file:', err);
                    return res.status(500).send('Error exporting data: Writing ZIP file');
                }
                res.download(filePath, `archive_${date}.zip`, function (err) {
                    if (err) {
                        console.error('Error sending ZIP file:', err);
                        return res.status(500).send('Error exporting data: Sending ZIP file');
                    }
                    fs.unlink(filePath, function (err) {
                        if (err) {
                            console.error('Error deleting ZIP file:', err);
                        }
                    });
                });
            });
        })
        .catch(function (error) {
            console.error('Error exporting data:', error.message || error);
            res.status(500).send('Error exporting data');
        });
    } else {
        res.render('error', { 
            error: { 
                message: 'You do not have permission to access this page', 
                redirect: 'resources' 
            } 
        });
    }
});

router.post('/admin/import', verifyToken, function (req, res, next) {

    if (req.user.level === 'admin'){

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const zip = new StreamZip({
        file: req.file.path,
        storeEntries: true
    });

    const errors = [];

    zip.on('error', function (err) {
        console.error('Error opening ZIP file:', err);
        errors.push('Error opening ZIP file');
        cleanupAndRespond();
    });

    zip.on('ready', function () {
        importResources()
            .then(importNews)
            .then(importUsers)
            .then(cleanupAndRespond)
            .catch((err) => {
                console.error('Error during import:', err);
                errors.push('Error during import');
                cleanupAndRespond();
            });
    });

    function importResources() {
        const resourcesFolder = 'resources/';
        const resourcesData = [];

        const zipEntries = Object.keys(zip.entries());
        zipEntries.forEach(entry => {
            if (entry.startsWith(resourcesFolder)) {
                const resourceId = entry.split('/')[1];
                const resourceDataEntry = zip.entryDataSync(entry).toString('utf8');

                try {
                    const resource = JSON.parse(resourceDataEntry);
                    resourcesData.push(resource);
                } catch (e) {
                    errors.push(`Error parsing resource data for ${resourceId}`);
                }
            }
        });

        if (resourcesData.length > 0) {
            const promises = resourcesData.map(resource =>
                axios.post('http://localhost:5001/resources', resource)
                    .catch((err) => {
                        errors.push(`Error importing resource: ${err.message}`);
                    })
            );

            return Promise.all(promises);
        } else {
            return Promise.resolve();
        }
    }

    function importNews() {
        const newsFolder = 'news/';
        const newsData = [];

        const zipEntries = Object.keys(zip.entries());
        zipEntries.forEach(entry => {
            if (entry.startsWith(newsFolder)) {
                const newsDataEntry = zip.entryDataSync(entry).toString('utf8');

                try {
                    const news = JSON.parse(newsDataEntry);
                    newsData.push(news);
                } catch (e) {
                    errors.push('Error parsing news data');
                }
            }
        });

        if (newsData.length > 0) {
            const promises = newsData.map(news =>
                axios.post('http://localhost:5001/news', news)
                    .catch((err) => {
                        errors.push(`Error importing news: ${err.message}`);
                    })
            );

            return Promise.all(promises);
        } else {
            return Promise.resolve();
        }
    }

    function importUsers() {
        const usersEntry = 'users/users.json';
        const usersDataEntry = zip.entryDataSync(usersEntry).toString('utf8');

        try {
            const users = JSON.parse(usersDataEntry);

            if (users.length > 0) {
                const promises = users.map(user =>
                    axios.post('http://localhost:5002/users', user)
                        .catch((err) => {
                            errors.push(`Error importing user: ${err.message}`);
                        })
                );

                return Promise.all(promises);
            } else {
                return Promise.resolve();
            }
        } catch (e) {
            errors.push('Error parsing users data');
            return Promise.reject(e);
        }
    }
    }
    else {
        res.render('error', { 
            error: { 
                message: 'You do not have permission to access this page', 
                redirect: 'resources' 
            } 
        });
    }
});


// GET /profile/edit - Render edit profile page
router.get('/profile/edit', verifyToken, function(req, res, next) {
    axios.get('http://localhost:5002/users/' + req.user.username + "?token=" + req.cookies.token)
      .then(userData => {
        res.render('edit-profile', { user: userData.data });
      })
      .catch(error => {
        res.render('error', {
          error: {
            message: 'Error fetching profile data for editing',
            stack: error.stack,
            redirect: '/profile'
          }
        });
      });
  });
  
// POST /profile/update - Handle profile update
router.post('/profile/update', verifyToken, upload.single('profilePicture'), function(req, res, next) {
    const { name, email } = req.body;
    let profilePicturePath = null;

    const updateData = { username: req.user.username, name, email };

    axios.put('http://localhost:5002/users/' + req.user.username + "?token=" + req.cookies.token, updateData)
        .then(() => {
            if (req.file) {
                profilePicturePath = path.join(__dirname, '..', 'archive', 'profilePictures', `${req.user.username}${path.extname(req.file.originalname)}`);
                
                fs.rename(req.file.path, profilePicturePath, err => {
                    if (err) {
                        console.error('Error moving uploaded profile picture:', err);
                    }
                });
            }

            res.redirect('/profile');
        })
        .catch(error => {
            console.error('Error updating profile:', error);
            res.render('error', {
                error: {
                    message: 'Error updating profile',
                    stack: error.stack,
                    redirect: '/profile/edit'
                }
            });
        });
});

  
module.exports = router;
