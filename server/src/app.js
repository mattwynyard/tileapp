'use strict';
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const GNSSAdapter = require('./serial.js');
const db = require('./db.js');
const java = require('./java.js');
const port = process.env.PROXY_PORT;
const host = process.env.PROXY;

/************************************************************** */
app.listen(port, () => {
  console.log(`Listening: http://${host}:${port}`);
});
 const adapter = new GNSSAdapter("COM5", 115200);

app.use(cors());
app.use(morgan('dev'));
app.use(helmet());
// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json({limit: '50mb', extended: false}));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: false }))
// Parse JSON bodies (as sent by API clients)
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  next();
});

app.post('/mouse', async (req, res) => {
  console.log(req.body)
  let result = await db.closestFootpath(req.body.lat, req.body.lng);
  //console.log(result.rows)
  res.send({ message: result.rows });
});

app.get('/api', async (req, res) => {
  let process = java.startJava("C12");
  
  if (process !== null) {
    res.send({ message: "ok" });
  }
});

app.get('/position', async (req, res) => {
  let merged = {...adapter.course, ...adapter.position};
  let photo = java.getPhoto();
  let message = java.getMessage();
  //console.log(message);
  res.send({ open: adapter.open, position: merged, message: message, photo: photo});
});

module.exports = app;