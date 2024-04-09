export default class Permissions {
    constructor(data) {
        this.data = new Set(data || []);
    }

    serialize() {
        return [...this.data];
    }

    has(...permissions) {
        return this.data.has("ADMIN")
            || permissions.every(p => this.data.has(p));
    }
}
