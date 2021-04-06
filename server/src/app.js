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
const path = require('path');

const VENDOR_ID = 5446;

let javaPID = null;
let comPort = null;
let adapter = null;
/************************************************************** */
let comConnect = (vendorID) => {
  usbDetect.find(vendorID, (err, device) => { 
    if (device.length > 0) {
      let deviceName = device[0].deviceName;
      let i = deviceName.indexOf("(");
      let j = deviceName.indexOf(")");
      comPort = deviceName.substring(i + 1, j);
      adapter = new GNSSAdapter(comPort, 115200);
      if (javaPID !== null) {
        adapter.setJava(javaPID);
      }
    } else {
      console.log("error: no device")
    }  
  });
}

usbDetect.on('remove', (device) => { 
  //adapter.open = false;
});

usbDetect.on('add', (device) => { 
  if(device.vendorId === 5446) {
    comConnect(device.vendorId);
  }
});

usbDetect.startMonitoring();
comConnect(VENDOR_ID);

app.listen(port, () => {
  console.log(`Listening: http://${host}:${port}`);
});
 
app.use(cors());
app.use(morgan('dev'));
//app.use(helmet());
// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json({limit: '50mb', extended: false}));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: false }))
// Parse JSON bodies (as sent by API clients)
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', 'localhost:5000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  next();
});

//serve tiles
app.get('/auckland/:z/:x/:y', async (req, res) => {
  res.sendFile(path.join(__dirname, '../', req.url));
});

app.post('/footpath', async (req, res) => {
  let result = await db.closestFootpath(req.body.lat, req.body.lng);
  for (let i = 0; i < result.rows.length; i++) {
    let completed = await db.isCompleted(result.rows[i].id);
    if (completed.rowCount === 0) {
      result.rows[i].grade = 0;
    } else {
      result.rows[i].grade = completed.rows[0].grade;
    }
  }
  res.send({ message: result.rows });
});

app.post('/footpaths', async (req, res) => {
  let result = await db.footpath();
  let box = await db.bbox();
  let extent = box.rows[0];
  for (let i = 0; i < result.rows.length; i++) {
    let completed = await db.isCompleted(result.rows[i].id);
    if (completed.rowCount === 0) {
      result.rows[i].grade = 0;
    } else {
      result.rows[i].grade = completed.rows[0].grade;
    }
  }
  res.send({ data: result.rows, bbox: extent });
});

app.post('/java', async (req, res) => {
  if (adapter !== null) {
    if (javaPID === null) {
      let process = java.startJava(req.body.camera, false);
      process.then((java) => {
        javaPID = java.pid;
        if (java.pid >= 0) { 
          //adapter.setJava(java.pid);
          res.send({ java: 'Connecting', gnss: adapter.open });
        } else {
          res.send({ java: 'Error', gnss: adapter.open });
        }
      });
    } else {
      res.send({ java: 'running', gnss: adapter.open });
    } 
  } else {
    res.send({ java: 'closed', gnss: false});
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

app.post('/grade', async (req, res) => {
  console.log(req.body);
  if (req.body.grade === "Reset") {
    await db.deleteCompleted(req.body.id);
    res.send({ message: "ok" });
  } else {
    let completed = await db.isCompleted(req.body.id);
    if (completed.rowCount === 0) {
      await db.insertCompleted(req.body.id, req.body.grade);
    } else {
      await db.updateCompleted(req.body.id, req.body.grade);
    }
    res.send({ message: "ok" });
  }
});

app.post('/access', async (req, res) => {
  console.log(req.body.latlng[0]);
  res.send({data: "hello from matt"});
});

 app.post('/gnss', async (req, res) => {
  res.send({open: adapter.open, com: adapter.serialPort.path});
});

app.get('/position', async (req, res) => {
  let merged = null;
  if (adapter.open) {
    try {   
    if (adapter.position === null) {
      res.send({ open: true, position: null, message: null, photo: null});
    } else {
      merged = {...adapter.course, ...adapter.position};
      let photo = java.getPhoto();
      let message = java.getMessage();
      if(message.connected) {
        adapter.setJava(javaPID);
      }
      res.send({ open: adapter.open, position: merged, message: message, photo: photo});
    } 
    } catch (err) {
      console.log(err);
      res.send({ open: true, position: null, message: null, photo: null});
    }
  } else {
    res.send({ open: false, position: null, message: null, photo: null});
  }
});

module.exports = app;