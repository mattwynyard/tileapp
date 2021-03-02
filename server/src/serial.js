const SerialPort = require('serialport')
const db = require('./db.js');
const Position = require('./PositionRecord.js');
const Course = require('./CourseRecord.js');

class GNSSAdapter {

    constructor(com, baud) {
        this.serialPort = new SerialPort(com, {
            baudRate: baud
        }, false); // this is the openImmediately flag [default is true]
        this.position = null
        this.course = null
        this.open = false;
        this.run(this);
    }

    getLatitude(data, direction) {
        let latDeg= data.substring(0,2);
        let latMin = data.substring(2, data.length - 1);
        let lat = Number(latDeg) + (Number(latMin) / 60)
        if (direction === 'S') {
            return -lat;
        } else {
            return lat;
        }
    }

    getLongitude(data, direction) {
        let lngDeg= data.substring(0,3);
        let lngMin = data.substring(3, data.length - 1);
        let lng = Number(lngDeg) + (Number(lngMin) / 60)
        if (direction === 'E') {
            return lng;
        } else {
            return -lng;
        }
    }

    getUTCTime(time) {
      let hours = time.substring(0, 2);
      let minutes = time.substring(2, 4);
      let seconds = time.substring(4, 6);
      let milliSeconds = time.substring(7, 9);
      var date = new Date();
      date.setUTCHours(hours);
      date.setUTCMinutes(minutes);
      date.setUTCSeconds(seconds);
      return new Date(date);
    }

    /**
     * formats js date object to NZDT string for postgres
     * @param {Date object} date
     */
    getNZDT(date) {
        let year = date.getFullYear();
        let month = date.getMonth();
        let day = date.getDate();
        let hours = date.getHours();
        let minutes = date.getMinutes();
        let seconds = date.getSeconds();
        let zone = date.getTimezoneOffset();

        return year + "-" + month.toString().padStart(2, '0') + "-" + day.toString().padStart(2, '0') + " "
        + hours.toString().padStart(2, '0') + ":" + minutes.toString().padStart(2, '0') + ":"
        + seconds.toString().padStart(2, '0') + " " + 'NZDT';
    }

    checkSum(s) {
      //console.log(s);
      var checksum = 0;
      for(let i = 0; i < s.length; i++) {
        checksum = checksum ^ s.charCodeAt(i);
      }
      // return the result
      return checksum.toString(16).toUpperCase();
    }

    async run(delegate) {
        this.serialPort.on('open', function() {
            console.log("Serial port open");
            delegate.open = true;
          });

        this.serialPort.on('close', function() {
          console.log("Serial port close");
          delegate.open = false;
        });

        this.serialPort.on('data', async (data) => {
          let pRecord = new Position();
          let cRecord = null;
          const buf = Buffer.from(data, 'ascii');
          const bufferStr = buf.toString();
          const sentences = bufferStr.split('\r\n');
          let errorBuffer = null;
          let error = false;
          sentences.forEach((sentence) => {
            let data = sentence.split(',');
            if (sentence.length !== 0) {
              let indexAsterix = sentence.indexOf('*');
              if (indexAsterix !== -1) {
                if(error) {
                  console.log("error buffer" + errorBuffer);
                  console.log("new sentence" + errorBuffer);
                  error = false
                }
                let checksumNMEA = sentence.substring(indexAsterix + 1, sentence.length);
                let checksum = this.checkSum(sentence.substring(1, indexAsterix));
                if (checksum === checksumNMEA) {
                  switch(data[0]) {
                    case "$GNTXT":
                      console.log(data);
                      break;
                    case "$GNGGA":
                      pRecord.timestamp = delegate.getNZDT(delegate.getUTCTime(data[1]));
                      pRecord.latitude = Number(delegate.getLatitude(data[2], data[3])).toFixed(6);
                      pRecord.longitude = Number(delegate.getLongitude(data[4], data[5])).toFixed(6);
                      pRecord.quality = data[6];
                      pRecord.satellites = data[7];
                      pRecord.hdop = data[8];
                      pRecord.altitude = data[11]; //geoidal seperation
                      break;
                    case "$GNGLL":
                      pRecord.status = data[6];
                    break;
                    case "$GNRMC":
                      cRecord = new Course();
                      cRecord.timestamp = delegate.getNZDT(delegate.getUTCTime(data[1]));
                      cRecord.status = data[2];
                      if (data[8].length !== 0) {
                        cRecord.course = Number(data[8]).toFixed(2); //true
                      } 
                      cRecord.speed = Number(data[7]  * 1.852).toFixed(2); //knots->metres
                      break;
                    case "$GNVTG":
                      //console.log(data)
                      break;
                    default:
                      break;
                  }
                } else {
                  console.log("Error checksum: " + sentence);
                  console.log("Buffer: " + bufferStr);
                  console.log("index: " + indexAsterix)
                } 
              } else {
                error = true;
                errorBuffer = sentence;
              }      
            }      
          });
          if (cRecord != null) {
            if (cRecord.isValid()) {
              delegate.course = cRecord;
              await db.addCourse(cRecord);
              //console.log("ïnset course: " + cRecord.timestamp)

            }
          }
          if (pRecord.isValid()) {
            delegate.position = pRecord;
            await db.addPosition(pRecord);
            //console.log("ïnset position: " + pRecord.timestamp)
          }
        });
    }
}

module.exports = GNSSAdapter;





