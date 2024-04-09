const path = require("path");
const crypto = require("crypto");

const UserCertificateStorage = require("../storage/UserCertificateStorage");

const FilesystemManager = require("../services/FilesystemManager");

const HttpError = require("../errors/HttpError");

class UserCertificate {
    constructor(data) {
        this.id = data.id;
        this.uuid = data.uuid;
        this.userId = +data.user_id;
    }

    get baseDir() {
        return path.join(
            FilesystemManager.STATIC_PATH,
            "user",
            this.userId + "",
            "certificates"
        );
    }

    get filename() {
        return `${this.uuid}.pdf`;
    }

    get filepath() {
        return path.join(
            this.baseDir,
            this.filename
        );
    }

    static async getByIds(ids) {
        const cert = await UserCertificateStorage.getByIds(ids);

        return cert.map(cert_data => new UserCertificate({
            id: cert_data.id,
            uuid: cert_data.filename.split(".")[0],
            user_id: cert_data.user_id
        }));
    }

    static async create(user_id, file) {
        if (file.mimetype != "application/pdf")
            throw new HttpError(400, "certificate file must be a pdf");

        const uuid = crypto.randomUUID();
        const id = await UserCertificateStorage.create(user_id, `${uuid}.pdf`);

        const cert = new UserCertificate({
            id,
            uuid,
            user_id
        });

        await FilesystemManager.mkdir(cert.baseDir);

        await FilesystemManager.writeFile(
            cert.filepath,
            file.buffer
        );

        return cert;
    }

    async delete() {
        if (await FilesystemManager.exists(this.filepath))
            await FilesystemManager.unlink(this.filepath);

        await UserCertificateStorage.delete(this.userId, this.filename);

        return this;
    }
}

module.exports = UserCertificate;
