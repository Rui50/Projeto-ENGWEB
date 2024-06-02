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

module.exports.insert = res => {
    var newResource = new Resource(res)
    return newResource.save()
}

module.exports.insertComment = (id, comment) => {
    return Resource
        .update({ _id: id }, { $push: { comments: comment } })
        .exec()
}

module.exports.insertRanking = (id, ranking) => {
    return Resource
        .update({ _id: id }, { $push: { rankings: ranking } })
        .exec()
}

module.exports.updateRanking = (id, ranking) => {
    return Resource
        .update({ _id: id, 'rankings.user': ranking.user }, { $set: { 'rankings.$.stars': ranking.stars } })
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