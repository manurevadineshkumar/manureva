const axios = require("axios");

const parsePath = path => {
    const parts = path.split(" ");

    return parts.length == 1
        ? {method: "GET", route: parts[0]}
        : {
            method: parts[0].toLocaleUpperCase(),
            route: parts.slice(1).join(" ")
        };
}

module.exports = async (
    path, data = null, {session_id = process.env.TEST_ADMIN_SESSION_ID} = {}
) => {
    const {method, route} = parsePath(path);
    const use_params = method == "GET";

    try {
        return await axios.request({
            url: "http://127.0.0.1:8080/" + route.slice(+(route[0] == "/")),
            method,
            headers: {
                "Content-Type": "application/json",
                ...(
                    session_id
                        ? {
                            "Cookie":
                                `Session-ID=${encodeURIComponent(session_id)}`
                        }
                        : {}
                )
            },
            ...(use_params && data ? {params: data} : {}),
            ...(!use_params && data ? {data} : {})
        });
    } catch (err) {
        return err.response;
    }
}
