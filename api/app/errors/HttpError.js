const HTTP_ERRORS = require("./http-errors.json");

class HttpError {
    constructor(status = 400, message = null, ...params) {
        if (typeof status == "string" && message === null) {
            message = status;
            status = 400;
        }

        this.status = status;
        this.message = message || HTTP_ERRORS[status] || HTTP_ERRORS[400];
        this.params = params;
    }

    serialize() {
        return {
            error: this.message,
            ...(this.params.length ? {params: this.params} : {})
        };
    }
}

module.exports = HttpError;
