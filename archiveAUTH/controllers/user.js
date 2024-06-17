var User = require('../models/user');

module.exports.list = () => {
    return User
        .find()
        .sort('name')
        .then(dados => {
            return dados
        })
        .catch(erro => {
            return erro
        })
}

module.exports.getUser = id => {
    return User.findOne({username: id})
        .then(resposta => {
            return resposta
        })
        .catch (erro => {
            return erro
        })
}   

module.exports.addUser = user => {
    return User.create(user)
        .then(dados => {
            return dados
        })
        .catch(erro => {
            return erro
        })
}

module.exports.loginUser = (user,data) => {
    return User.updateOne({username: user}, {$set: {lastAccess: data}})
        .then(resposta => {
            return resposta
        })
        .catch(erro => {
            return erro
        })
}

module.exports.updateUser = (id, info) => {
    return User.updateOne({username: id}, info)
        .then(resposta => {
            return resposta
        })
        .catch(erro => {
            return erro
        })
}

module.exports.updateUserPassword = (id, pwd) => {
    return User.updateOne({username:id}, pwd)
            .then(resposta => {
                return resposta
            })
            .catch(erro => {
                return erro
            })
}

module.exports.deleteUser = id => {
    return User.deleteOne({username: id})
        .then(resposta => {
            return resposta
        })
        .catch(erro => {
            return erro
        })
}

module.exports.checkUser = (username, email) => {
    return User.findOne({ $or: [{ username: username }, { email: email }] })
        .then(foundUser => {
            return foundUser;
        })
        .catch(error => {
            console.error('Error checking user:', error);
            throw error;
        });
};