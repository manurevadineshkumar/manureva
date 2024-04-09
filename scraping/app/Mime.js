class Mime {
    static EXTENSIONS = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "pdf": "application/pdf",
    };

    static lookup(path) {
        const extension = path.split(".").pop();

        return Mime.EXTENSIONS[extension] || null;
    }

    static validateMime(mime) {
        return Object.values(Mime.EXTENSIONS).includes(mime) ? mime : null;
    }

    static mimeToExtension(mime) {
        return Object.keys(Mime.EXTENSIONS).find(
            key => Mime.EXTENSIONS[key] === mime
        ) || null;
    }
}

module.exports = Mime;
