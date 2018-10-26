"use strict";

const express = require('express');
const app = express();
const router = require('express').Router();

var server = require("../dist/server");
new server.Server(app, router).run().then(() => {
    app.listen(3000, () => {
        console.log(`Listening on: 3000` + ' at ' + new Date().toString());
    });
});