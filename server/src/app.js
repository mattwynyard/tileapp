'use strict';

const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const GNSSAdapter = require('./serial.js');
const db = require('./db.js');
const port = process.env.PROXY_PORT;
const host = process.env.PROXY;

let net = require('net');
let photo = null;
let message = "";
let recording = "";

let server = net.createServer(function(client) { //'connection' listener
  console.log('client connected');
  client.on('end', () => {
  console.log('client disconnected');
  });

client.on('data', (data) => {
  let message = data.toString();
  console.log(message)
  let a = data.toString().split(',');
  if (a[0] === "RECORDING" || "NOTRECORDING") {
    recording = a[0];
  }
  console.log(a[0] + ",");
});
client.on('error', (error) => {
  console.log('client error:' + error);
});
  //c.write('hello\r\n');
  //client.pipe(client);
});
server.listen(5001, function() { //'listening' listener
  console.log('server bound');
});

let photoServer = net.createServer((client) => { //'connection' listener
  console.log('client connected');
  client.on('end', () => {
    console.log('client disconnected');
  });
  client.on('data', function(data) {
    //console.log("photo: " + data.toString());
    photo = data.toString();
  });
  client.on('error', function() {
    console.log('client error');
  });
});
photoServer.listen(5002, function() { //'listening' listener
  console.log('photo server bound');
});


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
  res.send({ message: "hello from server" });
});

app.get('/position', async (req, res) => {
  let merged = {...adapter.course, ...adapter.position};
  res.send({ open: adapter.open, position: merged, message: message, photo: photo});
});

module.exports = app;