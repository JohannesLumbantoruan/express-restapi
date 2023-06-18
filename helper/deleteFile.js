const fs = require('fs');
const path = require('path');

function deleteFile(imagePath) {
    const imgPath = path.join(process.cwd(), imagePath.replace('http://localhost:8080/', ''));
    fs.unlink(imgPath, err => console.log(err));
}

module.exports = deleteFile;