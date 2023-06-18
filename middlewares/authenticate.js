const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
    const token = req.get('Authorization')?.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            const error = new Error(err.name);
            error.statusCode = 401;
            return next(error)
        }

        req.user = decoded;
        next();
    });
}

module.exports = authenticate;