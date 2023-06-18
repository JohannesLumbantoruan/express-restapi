require('dotenv').config();

const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { Server } = require('socket.io');

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

        io.on('connection', socket => {
            console.log('User connected with id:', socket.id);
        });
    })
    .catch(err => {
        console.log(err);
    });