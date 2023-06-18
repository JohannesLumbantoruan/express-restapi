require('dotenv').config();

const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const authenticate = require('./middlewares/authenticate')

const feedRouter = require('./routes/feed');
const authRouter = require('./routes/auth');

const app = express();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, uuidv4() + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg'
    ) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

app.use(bodyParser.json());
app.use(cors());
app.use((req, res, next) => {
    const { method, path } = req;
    console.log(`${method} ${path}`);
    next();
});
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(multer({
    storage,
    fileFilter,
    limits: {
        fileSize: '5MB'
    }
}).single('image'));

app.use('/feed', authenticate, feedRouter);
app.use('/auth', authRouter);

app.use((err, req, res, next) => {
    console.log(err);
    let { statusCode, message } = err;
    if (!statusCode) statusCode = 500;
    if (!message) message = 'Internal Server Error';

    res
        .status(statusCode)
        .json({ message });
});

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');
        const server = app.listen(8080);
        const io = require('./socket').init(server);
        const users = {};

        io.on('connection', socket => {
            let user;
            const token = socket.handshake.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) throw err;
                user = decoded;
                users[user.email] = socket.id;
            });
            console.log(users);
            console.log(`${user.email ?? 'User'} connected with socket id: ${users[user.email]}`);

            socket.on('message', data => {
                const { to: toEmail, from: fromEmail, body } = data;
                console.log(users);
                console.log(`A message sending to ${toEmail} with socket id ${users[toEmail]} from ${fromEmail} with socket id ${users[fromEmail]}. The message body: ${body}`);
            });

            socket.on('disconnect', () => {
                console.log('User with id ' + socket.id + ' disconnected');
            });
        });
    })
    .catch(err => {
        console.log(err);
    });