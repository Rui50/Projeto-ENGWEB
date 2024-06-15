var Resource = require('../models/resource');

module.exports.list = () => {
    return Resource
        .find()
        .sort({ registrationDate : 1 })
        .exec()
}

module.exports.findById = id => {
    return Resource
        .findOne({ _id: id })
        .exec()
}

module.exports.findByAuthor = author => {
    return Resource
        .find({ author: author })
        .exec()
}

module.exports.findByType = type => {
    return Resource
        .find({ type: type })
        .exec()
}

module.exports.getByTitle = title => {
    return Resource
        .find({ title: {$regex: title} })
        .then(resposta => {
            return resposta
        })
        .catch(erro => {
            return erro
        })
}

module.exports.SearchByAuthor = author => {
    const searchRegex = new RegExp(author, 'i');
    return Resource
        .find({ author: { $regex: searchRegex } })
        .exec();
}

module.exports.SearchByType = type => {
    const searchRegex = new RegExp(type, 'i');
    return Resource
        .find({ type: { $regex: searchRegex } })
        .exec();
}

module.exports.SearchByYear = year => {
    const searchYear = parseInt(year);

    return Resource
        .find({ year: searchYear })
        .exec();
};

module.exports.SearchByTags = tags => {
    const searchRegex = new RegExp(tags, 'i');
    return Resource
        .find({ tags: { $regex: searchRegex } })
        .exec();
};


module.exports.insert = res => {
    var newResource = new Resource(res)
    return newResource.save()
}

module.exports.insertComment = (id, comment) => {
    return Resource
        .updateOne({ _id: id }, { $push: { comments: comment } })
        .exec()
}

module.exports.insertRanking = (id, ranking) => {
    return Resource
        .updateOne({ _id: id }, { $push: { rankings: ranking } })
        .exec()
}

module.exports.updateRanking = (id, ranking) => {
    return Resource
        .updateOne({ _id: id, 'rankings.user': ranking.user }, { $set: { 'rankings.$.stars': ranking.stars } })
        .exec()
}

module.exports.update = (id, res) => {
    return Resource
        .findOneAndUpdate({ _id: id }, res, { new: true })
        .exec()
}

module.exports.remove = id => {
    return Resource
        .deleteOne({ _id: id })
        .exec()
}

module.exports.getComments = id => {
    return Resource
        .findOne({ _id: id }, { comments: 1 })
        .exec()
}

module.exports.getCommentsWithResource = id => {
    return Resource
        .findOne({ _id: id }, { title: 1, comments: 1 })
        .exec();
};


module.exports.getRankings = id => {
    return Resource
        .findOne({ _id: id }, { rankings: 1 })
        .exec()
}

module.exports.deleteComment = (id, commentId) => {
    return Resource.updateOne(
        { _id: id },
        { $pull: { comments: { commentID: commentId } } }
    ).exec();
};