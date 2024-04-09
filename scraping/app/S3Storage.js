const axios = require("axios");
const crypto = require("crypto");
const {
    S3Client,
    ListBucketsCommand,
    PutObjectCommand,
    DeleteObjectsCommand
} = require("@aws-sdk/client-s3");

const FilesystemManager = require("./FilesystemManager");
const Mime = require("./Mime");

class S3Storage {
    static client = null;

    static OVH_ACCESS_KEY_ID = process.env.OVH_ACCESS_KEY_ID;
    static OVH_SECRET_ACCESS_KEY = process.env.OVH_SECRET_ACCESS_KEY;
    static OVH_BUCKET_NAME = process.env.OVH_BUCKET_NAME;
    static OVH_REGION = process.env.OVH_REGION;
    static OVH_ENDPOINT = process.env.OVH_ENDPOINT;
    static OVH_S3_ENDPOINT = process.env.OVH_S3_ENDPOINT;

    static async connect() {
        if (S3Storage.client)
            return;

        S3Storage.client = new S3Client({
            region: S3Storage.OVH_REGION,
            credentials: {
                accessKeyId: S3Storage.OVH_ACCESS_KEY_ID,
                secretAccessKey: S3Storage.OVH_SECRET_ACCESS_KEY
            },
            endpoint: S3Storage.OVH_ENDPOINT,
        });

        const data = await S3Storage.client.send(new ListBucketsCommand({}));

        if (!data.Buckets.find(
            bucket => bucket.Name == S3Storage.OVH_BUCKET_NAME
        ))
            throw new Error(`Bucket ${S3Storage.OVH_BUCKET_NAME} not found`);

        return S3Storage.client;
    }

    static async upload(buffer, mime, key = crypto.randomUUID()) {
        if (process.env.NODE_ENV === "test")
            return;

        await S3Storage.connect();

        if (!mime)
            throw new Error("Mime type not found");

        const ext = Mime.mimeToExtension(mime);

        if (!ext)
            throw new Error(`Mime type ${mime} not supported`);

        const params = {
            Bucket: S3Storage.OVH_BUCKET_NAME,
            Key: `${key}.${ext}`,
            Body: buffer,
            ContentType: mime,
            ACL: "public-read"
        };

        const command = new PutObjectCommand(params);

        const response = await S3Storage.client.send(command);

        if (response.$metadata.httpStatusCode != 200)
            throw new Error(`Upload failed for ${params.Key}`);

        return {
            url: `${S3Storage.OVH_S3_ENDPOINT}/${params.Key}`,
            uuid: params.Key
        };
    }

    static async uploadFile(path, key = crypto.randomUUID()) {
        return await S3Storage.upload(
            await FilesystemManager.readFile(path),
            Mime.lookup(path),
            key
        );
    }

    static async uploadFromUrl(url, key = crypto.randomUUID()) {
        if (process.env.NODE_ENV === "test")
            return {uuid: "00000000-test-uuid-0000-000000000000"};

        const {data, headers} = await axios.get(
            url,
            {responseType: "arraybuffer"}
        );

        return await S3Storage.upload(
            data,
            Mime.validateMime(headers["content-type"]),
            key
        );
    }

    static async delete(uuids) {
        if (process.env.NODE_ENV === "test")
            return;

        await S3Storage.connect();

        const params = {
            Bucket: S3Storage.OVH_BUCKET_NAME,
            Delete: {
                Objects: [
                    ...uuids.map(uuid => ({ Key: uuid })),
                    ...uuids.map(uuid => ({ Key: `u2net/${uuid}` })),
                    ...uuids.map(uuid => ({ Key: `u2netp/${uuid}` }))
                ]
            }
        };

        if (!params.Delete.Objects.length)
            return true;

        const command = new DeleteObjectsCommand(params);

        const response = await S3Storage.client.send(command);

        if (response.$metadata.httpStatusCode != 200)
            throw new Error(`Delete failed for ${params.Key}`);

        return true;
    }
}

module.exports = S3Storage;
