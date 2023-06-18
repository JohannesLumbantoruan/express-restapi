const { validationResult } = require('express-validator');

const deleteFile = require('../helper/deleteFile');

const Post = require('../models/post');
const User = require('../models/user');
const io = require('../socket');

exports.getPosts = async (req, res, next) => {
    const page = req.query.page || 1;
    const perPage = 2;
    let totalItems;

    Post
        .find()
        .countDocuments()
        .then(count => {
            totalItems = count;

            return Post
                .find()
                .skip((page - 1) * perPage)
                .limit(2)
                .populate({ path: 'creator', select: 'name email'});
        })
        .then(posts => {
            res
                .status(200)
                .json({
                    message: 'Posts successfully fetched',
                    posts,
                    totalItems
                })
        })
        .catch(err => {
            if (!err.statusCode) err.statusCode = 500;
            if (!err.message) err.message = 'Failed to fetch the posts';
            next(err);
        })
};

exports.storePost = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const error = new Error('Validation failed');
        error.statusCode = 422;

        throw error;
    }

    const { title, content } = req.body;
    if (!req.file) {
        const err = new Error('No image provided');
        err.statusCode = 422;
        throw err;
    }

    if (!req.file) {
        const err = new Error('No image picked');
        err.statusCode = 422;
        throw err;
    }

    const imageUrl = 'http://localhost:8080/' + req.file.path.replace('\\', '/');

    const post = new Post({
        title,
        content,
        imageUrl,
        creator: req.user.userId
    });

    post
        .save()
        .then(() => User.findById(req.user.userId))
        .then(user => {
            user.posts.push(post);
            return user.save();
        })
        .then(user => {
            io.getIO().emit('posts', { action: 'create', post: { ...post._doc, creator: { _id: user._id, name: user.name }} });

            res
                .status(200)
                .json({
                    message: 'Post created successfully',
                    post
                });
        })
        .catch(err => {
            deleteFile(imageUrl);
            if (!err.statusCode) err.statusCode = 500;
            if (!err.message) err.message = 'Failed to create the post';
            next(err);
        });
};

exports.getPost = (req, res, next) => {
    const { postId } = req.params;

    Post
        .findById(postId)
        .then(async post => {
            if (!post) {
                const err = new Error('Post not found');
                err.statusCode = 404;
                return next(err);
            }

            const data = await post.populate({ path: 'creator', select: 'name email'});

            res.status(200).json({ message: 'Post fetched', post: data })
        })
        .catch(err => {
            if (!err.statusCode) err.statusCode = 500;
            next(err);
        });
};

exports.updatePost = (req, res, next) => {
    const { postId } = req.params;

    const errors = validationResult(req);

    if (!errors.isEmpty) {
        const err = new Error('Validation failed');
        err.statusCode = 422;
        throw err;
    }

    const { title, content } = req.body;
    let { image: imageUrl } = req.body;

    if (req.file) imageUrl = 'http://localhost:8080/' + req.file.path.replace('\\', '/');
    
    Post
        .findById(postId)
        .then(post => {
            if (!post) {
                const err = new Error('Post not found');
                err.statusCode = 404;
                return next(err);
            }

            if (post.creator.toString() !== req.user.userId) {
                const err = new Error('Not authorized');
                err.statusCode = 403;
                return next(err);
            }

            if (imageUrl !== 'undefined' && imageUrl !== post.imageUrl) deleteFile(post.imageUrl);

            post.title = title;
            post.content = content;
            if (imageUrl !== 'undefined') post.imageUrl = imageUrl;
            return post.save();
        })
        .then(result => {
            res.status(200).json({
                message: 'Updated post succesfully',
                post: result
            });
        })
        .catch(err => {
            if (!err.statusCode) err.statusCode = 500;
            if (!err.message) err.message = 'Failed to create the post';
            next(err);
        });
};

exports.deletePost = (req, res, next) => {
    const { postId } = req.params;

    Post
        .findById(postId)
        .then(async post => {
            if (!post) {
                const err = new Error('Post not found');
                err.statusCode = 404;
                return next(err);
            }

            if (post.creator.toString() !== req.user.userId) {
                const err = new Error('Not authorized');
                err.statusCode = 403;
                return next(err);
            }

            deleteFile(post.imageUrl);

            await Post.findByIdAndRemove(postId);
            const user = await User.findById(req.user.userId);
            user.posts.pull(postId);
            user.save();
            res.status(200).json({ message: 'Post deleted successfully' });
        })
        .catch(err => {
            if (!err.statusCode) err.statusCode = 500;
            if (!err.message) err.message = 'Failed to delete the post';
            next(err);
        });
};