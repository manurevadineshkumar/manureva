const crypto = require("crypto");

class Job {
    constructor(data) {
        this.id = data.id ?? crypto.randomUUID();
        this.operationId = data.operation_id;
    }

    serialize() {
        return {
            id:           this.id,
            operation_id: this.operationId,
        };
    }
}

module.exports = Job;
