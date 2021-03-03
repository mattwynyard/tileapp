'use strict';
const { text } = require('body-parser');
let net = require('net');
const app = require('./app.js');
let photo = null;
let message = "";
let connected = false;
let javaStatus = {error: null, stdout: null, stderr: null};

let messageObject = {
    connected: false,
    recording: false,
    battery: null,
    error: null,
    filename: null,
    savetime: null,
    frequency: null,
}
let server = net.createServer((listener) => { //'connection' listener
    //c.write('hello\r\n');
  //client.pipe(client);
  listener.on('data', (data) => {
    var t0 = new Date().getTime();
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
            case "NOTCONNECTED":
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
                    messageObject.savetime = message[2];
                    messageObject.frequency = message[3];
                }
                break;
            }     
      });
      var t1 = new Date().getTime();
        console.log("Call to doSomething took " + (t1 - t0) + " milliseconds.")
  });
  listener.on('error', (error) => {
    console.log('client error:' + error);
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
     * @param {string} camera 
     * @param {callback} status 
     */
    startJava : async(camera) => {
      console.log("starting java");
      
      let exec = require('child_process').exec, child;
      child = exec('java -jar ./onsite-camera-app.jar ' + camera,
        (error, stdout, stderr) => {
            javaStatus.error = error;
            javaStatus.stdout = stdout;
            javaStatus.stderr = stderr;
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if(error !== null) {
                console.log('exec error: ' + error);
               
            }     
        });
        child.on('exit', (code) => {
            console.log(`child process exited with code ${code}`);
          }); 
        return child; 
    },

    getPhoto: ()=> {
        return photo;
    },

    getMessage: () => {
        return messageObject;
    },

}