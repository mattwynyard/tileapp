class CourseRecord {

    constructor() {
        this.timestamp = null;
        this.status = null;
        this.course = null;
        this.speed = null;
        
    }

    isValid() {

        if (this.timestamp != null) {
            return true;
        } else {
            return false;
        }  
    }

    toString() {
        return "{timestamp: " + this.timestamp + ", status: " + this.status + ", course: " + this.course + ", speed: " + this.speed + "}"
    }
}

module.exports = CourseRecord;