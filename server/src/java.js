'use strict';
const { text } = require('body-parser');
let net = require('net');
const app = require('./app.js');
const db = require('./db.js');
let photo = null;
let connected = false;
let javaStatus = {error: null, stdout: null, stderr: null};

let mSocket = null;

let messageObject = {
    connected: false,
    recording: false,
    battery: null,
    error: null,
    time: null,
    filename: null,
    savetime: null,
    frequency: null,
}

let formatDate = (d => {
    let raw = d.split(' ');
    let datePart = raw[0].split('/');
    let timePart = raw[1].split(':');
    let date = new Date();
    date.setDate(datePart[0]);
    date.setMonth(datePart[1] - 1);
    date.setYear(datePart[2]);
    date.setHours(timePart[0]);
    date.setMinutes(timePart[1]);
    date.setSeconds(timePart[2]);
    return date;
});

let addTime = (date, seconds) => {
    let time = date.getTime();
    time = time += (1000 * seconds);
    let dateCorrected = new Date(time);
    return dateCorrected;
}

/**
     * formats js date object to NZDT string for postgres
     * @param {Date object} date
     */
let getNZST = (date) => {
        let year = date.getFullYear();
        let month = date.getMonth();
        let day = date.getDate();
        let hours = date.getHours();
        let minutes = date.getMinutes();
        let seconds = date.getSeconds();
        return year + "-" + month.toString().padStart(2, '0') + "-" + day.toString().padStart(2, '0') + " "
        + hours.toString().padStart(2, '0') + ":" + minutes.toString().padStart(2, '0') + ":"
        + seconds.toString().padStart(2, '0') + " " + 'NZST';
    }



let server = net.createServer((socket) => { //'connection' listener
    mSocket = socket;
    let timeFlag = null;
    let counter = 0; //seconds
    let ready = 0; //0 intialise 1 - ignore 2-read
    let record = {};
    socket.on('data', (data) => {
      let buffer = data.toString().split(',');
      buffer.pop(); //get rid of stupid comma on end of message lance wanted!!!
      buffer.forEach((element) => {
        switch(element) {
            case "CONNECTED":
                messageObject.connected = true;  
                break;
            case "NOTCONNECTED":
                messageObject.connected = false;  
                break;
            case "RECORDING":
                messageObject.recording = true;  
                break;
            case "NOTRECORDING":
                messageObject.recording = false;  
                break;
            default:
                if (element.includes("B:")) {
                    let battery = element.split(":");
                    messageObject.battery = battery[1];
                } else if (element.includes("E:")) {
                    let error = element.split(":");
                    messageObject.error = error[1];
                } else if (element.includes("T:")) {
                    let message = element.split("|");
                    messageObject.filename = message[1];
                    record.photo = message[1];
                    messageObject.savetime = message[2];
                    record.savetime = message[2];
                    messageObject.frequency = message[3];
                    record.frequency = message[3];
                    let date = formatDate(message[0].substring(2, message[0].length - 4));
                    record.gnsstime = getNZST(date);
                    console.log(record.gnsstime);
                    // let d = new Date();
                    // let timestamp = getNZST(d);
                    // record.timestamp = timestamp;
                    if (ready === 0) {
                        timeFlag = date.toString();
                        ready = 1;
                    } else {
                        if (ready === 1) {
                            if (timeFlag !== date.toString()) { 
                                ready = 2;
                                timeFlag = date.toString();                          
                                break;
                            } else {
                                //ignore
                            }
                        } else if (ready === 2)              
                         {
                            if (timeFlag === date.toString()) {
                                counter += 1;
                                record.corrected = getNZST(addTime(date, counter));
                            } else {
                                record.corrected = timeFlag = getNZST(date);
                                counter = 0;            
                            }
                            db.insertPhoto(record)
                        } else {
                            //shouldnt get here
                        }
                    }    
                } 

                break;
            }     
      });

      socket.on('error', (error) => {
        console.log('client error:' + error);
      });
      
      
  });

  });
  server.listen(5001, () => { //'listening' listener
    console.log('server bound');
  });

  server.on('connection', () => {
    console.log('message client connected');
    connected = true;
  });

  server.on('close', () => {
    console.log('message client closed');
  });

  server.on('error', () => {
    console.log('message client error');
  });

let photoServer = net.createServer((listener) => { //'connection' listener
  listener.on('end', () => {
    console.log('photo client disconnected');
  });
  listener.on('data', (data) => {
    photo = data.toString(); //base64 string
  });
  listener.on('error', () => {
    console.log('photo client error');
  });
});
photoServer.listen(5002, () => { //'listening' listener
  console.log('photo server bound');
});

photoServer.on('connection', () => {
  console.log('photo client connected');
});

photoServer.on('close', () => {
  console.log('photo client closed');
});

photoServer.on('error', () => {
  console.log('photo client error');
});

module.exports = {
    /**
     * 
     * @param {string} camera - the camera id
     * @param {boolean} debug - print java output to standard stream 
     */
    startJava : async (camera, debug) => {
        console.log("starting java");
        const { spawn } = require('child_process');
        const java = spawn('java -jar ./onsite-camera-app.jar ' + camera, {shell: true});
        java.stdout.on('data', (data) => {
            if (debug) {
                console.log("java: " + data.toString());
            }
        });

        java.stderr.on('data', (err) => {
            console.log("java: " + err.toString());
        });
        return java; 
    },
    
    getPhoto: ()=> {
        return photo;
    },

    getMessage: () => {
        return messageObject;
    },

    setMessage: (message) => {
        mSocket.write(message)
    }

}