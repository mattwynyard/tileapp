class CourseRecord {

    constructor() {
        this.timestamp = null;
        this.status = null;
        this.mode = null;
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