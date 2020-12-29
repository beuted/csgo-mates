"use strict";

var mysql = require('mysql');
var config = require('./config');

//mysql config
var connection = mysql.createConnection({
    host     : 'localhost',
    user     : config.mysql.user,
    password : config.mysql.password,
    database : config.mysql.database
});

module.exports = connection;