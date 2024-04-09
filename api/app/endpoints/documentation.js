class Route {
    static DOCUMENTATION = JSON.stringify(require("../openapi.json"), null, 2);

    static showSpecification() {
        return Route.DOCUMENTATION;
    }
}

module.exports = Route;
