const express = require('express');

const router = express.Router();
const DB_FILE = require('../consts/file-paths.js').DB_FILE;

//получение базы данных (zip)
router.get('/database', (req, res) => {
    res.sendFile(DB_FILE);
});

module.exports = router;