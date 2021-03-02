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

       
        if (this.timestamp != null && this.latitude != null && this.longitude != null) {
            return true;
        } else {
            return false;
        }
        
    }
}

module.exports = PositionRecord;