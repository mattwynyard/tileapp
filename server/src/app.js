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
const { } = require('helmet');
const port = process.env.PROXY_PORT;
const host = process.env.PROXY;
const usbDetect = require('usb-detection');

let javaPID = null;
let comPort = null;
let adapter = null;
/************************************************************** */
let comConnect = () => {
usbDetect.find(5446, (err, device) =>{ 
    if (device.length > 0) {
      let deviceName = device[0].deviceName;
      let i = deviceName.indexOf("(");
      let j = deviceName.indexOf(")");
      comPort = deviceName.substring(i + 1, j);
      adapter = new GNSSAdapter(comPort, 115200);
    } else {
      console.log("error: no device")
    }  
  });
}

usbDetect.on('remove', (device) => { 
  console.log('remove', device); 
  adapter = null;
});

usbDetect.on('add', (device) => { 
  console.log('add', device); 
  comConnect(device);
});

usbDetect.startMonitoring();
comConnect();

app.listen(port, () => {
  console.log(`Listening: http://${host}:${port}`);
});
 
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
  let result = await db.closestFootpath(req.body.lat, req.body.lng);
  res.send({ message: result.rows });
});

app.get('/api', async (req, res) => {
  if (javaPID === null) {
    let process = java.startJava("C12", false);
    process.then((java) => {
    console.log(java.pid);
    javaPID = java.pid;
    if (java.pid >= 0) { 
      res.send({ java: 'starting', gnss: adapter.open });
    } else {
      res.send({ java: 'error', gnss: adapter.open });
    }
    
    });
  } else {
    res.send({ java: 'running', gnss: adapter.open });
  } 
});

/**
 * starts and stops camera recording
 */
app.post('/record', async (req, res) => {
  if (!req.body.command) {
    java.setMessage("Start");
  } else {
    java.setMessage("Stop");
  }
  res.send({ message: "ok" });
});

app.get('/position', async (req, res) => {
  let merged = {...adapter.course, ...adapter.position};
  let photo = java.getPhoto();
  let message = java.getMessage();
  //console.log(message);
  res.send({ open: adapter.open, position: merged, message: message, photo: photo});
});

module.exports = app;