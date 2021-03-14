class PositionRecord {

    constructor() {
        this.timestamp = null;
        this.latitude = null;
        this.longitude = null;
        this.quality = null;
        this.satellites = null;
        this.hdop = null;
        this.altitude = null;
        this.status = null;
    }

    isValid() {
        if (this.timestamp === null || this.latitude === null || this.longitude === null || this.quality === '0') {
            return false;
        } else {
            return true;
        }   
    }

    toString() {
        return "{timestamp: " + this.timestamp + ", latitude: " + this.latitude + ", longitude: " + this.longitude 
        + ", quality: " + this.quality + ", satellites: " + this.satellites + ", hdop: " + this.hdop 
        + ", altitude: " + this.altitude + ", status: " + this.status + "}"
    }
}

module.exports = PositionRecord;