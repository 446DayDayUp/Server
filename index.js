'use strict';
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const {DB_USERNAME, DB_PASSWORD} = require('./config/mongodb.js');
const {getSquireCord, mBetweenCoords} = require('./lib/location.js');

const MongoClient = require('mongodb').MongoClient;
const DB_URL = `mongodb://${DB_USERNAME}:${DB_PASSWORD}@ds155961.mlab.com:55961/heroku_qjtg66vs`;
let database = null;

MongoClient.connect(DB_URL, (err, db) => {
  database = db;
});

app.get('/', (req, res) => {
  res.send('Hello world');
});

app.get('/create-chat-room', (req, res) => {
  res.send('GET create chat room request');
});

app.get('/get-chat-rooms', (req, res) => {
  let {lat, lng, range} = req.query;
  if (!lat || !lng || !range) {
    res.status(500).send('Need params: lat, lng, range!');
  }
  if (!database) res.status(500).send('Database uninitialized!');
  if (range > 10000) res.status(500).send('Range longer than 10km are not allowed!');
  let {top, btm, rgt, lft} = getSquireCord(parseFloat(lat), parseFloat(lng), parseFloat(range));
  let query = [{lat: {$gt: btm, $lt: top}}, {lng: {$gt: lft, $lt: rgt}}]
  if (req.query.tag) {
    query.push({tags: req.query.tag})
  }
  database.collection('chatGroups').find({$and: query})
    .toArray((err, groups) => {
      if (err) res.status(500).send(err.toString());
      groups.filter((group) =>
          mBetweenCoords(group.lat, group.lng, lat, lng) < range);
      res.send(groups);
    });
});

io.on('connection', (socket) => {
  console.log('a user connected');
});

server.listen(process.env.PORT || 8000, () => {
  console.log('Example app listening on port 8000!');
});
