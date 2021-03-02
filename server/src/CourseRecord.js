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
}

module.exports = CourseRecord;