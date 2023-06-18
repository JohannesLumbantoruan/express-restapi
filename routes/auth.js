const express = require('express');
const { body } = require('express-validator');

const authenticate = require('../middlewares/authenticate');

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.post(
    '/signup',
    [
        body('email')
            .notEmpty().withMessage('Email can\'t be empty')
            .isEmail().withMessage('Use valid email')
            .normalizeEmail()
            .custom(async value => {
                const user = await User.findOne({ email: value });
                if (user) throw new Error('Email already in use');
            }),
        body('name')
            .notEmpty().withMessage('Name can\'t be empty')
            .trim(),
        body('password')
            .notEmpty().withMessage('Password can\'t be empty')
            .matches(/^\S*$/g).withMessage('Password can\'t included space')
            .isLength({ min: 8 }).withMessage('Password at least 8 characters')
    ],
    authController.signup
);

router.post(
    '/login',
    [
        body('email')
            .notEmpty().withMessage('Email can\t be empty')
            .isEmail().withMessage('Use a valid email')
            .normalizeEmail(),
        body('password')
            .notEmpty().withMessage('Password can\'t be empty')
    ],
    authController.login
);

router.get('/status', authenticate, authController.getStatus);

router.patch('/status', authenticate, authController.updateStatus);

module.exports = router;