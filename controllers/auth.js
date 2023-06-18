const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

exports.signup = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) res.status(422).json({ message: 'Validation failed', errors: errors.array({ onlyFirstError: true }) });

    const { email, name, password } = req.body;

    console.log(email, name, password);

    bcrypt.hash(password, 12)
     .then(hash => {
        const user = new User({
            email,
            name,
            password: hash
        });

        return user.save();
     })
     .then(result => {
        console.log(result);

        res.status(201).json({ message: 'User created succesfully', userId: result._id });
     })
     .catch(err => {
        if (!err.statusCode) err.statusCode = 500;
        if (!err.message) err.message = 'User failed to create';
        next(err);
     });
};

exports.login = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) res.status(422).json({ message: 'Validation failed', errors: errors.array({ onlyFirstError: true }) });

    const { email, password } = req.body;
    let fetchedUser;

    User
        .findOne({ email })
        .then(user => {
            if (!user) {
                const err = new Error('User not found');
                err.statusCode = 404;
                return next(err);
            }

            fetchedUser = user;

            return bcrypt.compare(password, user.password);
        })
        .then(isEqual => {
            if (!isEqual) {
                const err = new Error('Wrong password');
                err.statusCode = 401;
                return next(err);
            }

            const token = jwt.sign({
                email: fetchedUser.email,
                userId: fetchedUser._id
            }, process.env.JWT_SECRET, { expiresIn: '1hr' });

            res.status(200).json({ token, userId: fetchedUser._id.toString() });
        })
        .catch(err => {
            if (!err.statusCode) res.statusCode = 500;
            next(err);
        })
};

exports.getStatus = (req, res, next) => {
    User
        .findById(req.user.userId)
        .then(user => {
            if (!user) {
                const err = new Error('User not found');
                err.statusCode = 404;
                return next(err);
            }

            res.status(200).json({ message: 'Status fetched succesfully', status: user.status });
        })
        .catch(err => {
            if (!err.statusCode) res.statusCode = 500;
            next(err);
        });
};

exports.updateStatus = (req, res, next) => {
    const { status } = req.body;

    User
        .findById(req.user.userId)
        .then(user => {
            if (!user) {
                const err = new Error('User not found');
                err.statusCode = 404;
                return next(err);
            }

            user.status = status;
            return user.save();
        })
        .then(result => {
            res.status(200).json({ message: 'Status updated', status });
        })
        .catch(err => {
            if (!err.statusCode) res.statusCode = 500;
            next(err);
        });
};