import {io} from "socket.io-client";

const URL = window.location.protocol == "https:"
    ? "api.korvin.io"
    : "127.0.0.1:8080";

export default class Socket {
    constructor() {
        this.socket = null;
    }

    connect(namespace) {
        this.socket = io(URL + "/" + namespace, {withCredentials: true});
    }

    disconnect() {
        return this.socket?.disconnect();
    }

    on(...args) {
        return this.socket.on(...args);
    }

    emit(...args) {
        return this.socket.emit(...args);
    }
}
