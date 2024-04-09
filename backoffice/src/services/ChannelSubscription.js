import {EventEmitter} from "events";

import Socket from "@/services/Socket.js";

export default class ChannelSubscription extends EventEmitter {
    constructor(uuid) {
        super();

        this.socket = new Socket();

        this.socket.connect("log-channel");
        this.socket.emit("subscribe", {uuid});

        this.socket.on("message", message => {
            this.emit("data", message);
        });

        this.socket.on("disconnect", () => {
            this.emit("end");
        });
    }
}
