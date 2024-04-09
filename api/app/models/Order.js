const path = require("path");
const fsPromises = require("fs").promises;

const OrderStorage = require("../storage/OrderStorage");

const ProductHelper = require("../business-services/product/helper/Product.helper");

const FilesystemManager = require("../services/FilesystemManager");

const Product = require("./Product");
const User = require("./User");

const {PERMISSIONS} = require("../models/Permissions");

class Order {
    constructor(data) {
        this.id = +data.id;
        this.productId = +data.product?.id || +data.product_id;
        this.product = data.product ? new Product(data.product) : null;
        this.user = data.user ? new User(data.user) : null;
        this.priceEur = +data.price_eur;
        this.boughtPrice = +data.bought_price;
        this.placementDate = data.placement_date || new Date();
        this.channelId = data.channel_id;
        this.status = data.status;
        this.commentAdmin = data.comment_admin;
        this.commentUser = data.comment_user;
        this.korvinReceptionDate = data.korvin_reception_date;
    }

    async serialize() {
        return {
            id: this.id,
            product_id: this.productId,
            price_eur: this.priceEur,
            user: (await this.user?.serialize()) || null,
            placement_date: +this.placementDate,
            channel_id: this.channelId,
            status: this.status,
            comment: this.commentAdmin,
            korvin_reception_date: this.korvinReceptionDate,
        };
    }

    serializeStatus(user_type) {
        if (user_type === "buyer") {
            if (this.status === "PENDING" || this.status === "RECEIVED")
                return "PENDING";
            else
                return "DELIVERED";
        }
        return "SOLD";
    }

    async serializeForUser(user, user_type) {
        const data = {
            id: this.id,
            product_id: this.productId,
            channel_id: await user.hasPermission(
                PERMISSIONS.ORDER_SHOW_SALESCHANNEL
            )
                ? this.channelId
                : null,
            status: await user.hasPermission(PERMISSIONS.ORDER_SHOW_STATUS)
                ? this.serializeStatus(user_type)
                : null,
            comment: await user.hasPermission(PERMISSIONS.READ_ORDER_DETAILS)
                ? this.commentUser : null,
            placement_date: await user.hasPermission(
                PERMISSIONS.ORDER_SHOW_DATE
            )
                ? +this.placementDate : null,
        };
        if (user_type === "buyer") {
            data.price_eur = await user.hasPermission(
                PERMISSIONS.ORDER_SHOW_PRICE
            )
                ? this.priceEur
                : null;
        } else {
            data.bought_price = await user.hasPermission(
                PERMISSIONS.ORDER_SHOW_PRICE
            )
                ? this.boughtPrice
                : null;
        }
        return data;
    }

    static async create({
        product,
        user,
        price_eur,
        placement_date = new Date(),
        channel_id,
    }) {
        const wholesalePriceCents = ProductHelper.getEffectiveWholesalePrice(product);
        price_eur = price_eur || wholesalePriceCents / 100;

        const id = await OrderStorage.create({
            product_id: product.id,
            user_id: user.id,
            price_eur,
            placement_date,
            channel_id,
        });
        return new Order({
            id,
            product: product?.serialize(),
            user: user?.serialize(),
            price_eur,
            placement_date,
            channel_id,
        });
    }

    static async countAll() {
        return await OrderStorage.countAll();
    }

    static async listAll(prev_id = 0, batch_size = 16) {
        const orders = await OrderStorage.listAll(prev_id, batch_size);
        return await Promise.all(
            orders.map(async (orderData) => {
                const order = new Order(orderData);
                return await order.serialize();
            })
        );
    }

    static async listBoughtOrders(
        prev_id = 0,
        batch_size = 16,
        user,
        user_type
    ) {
        const orders = await OrderStorage.listBoughtOrders(
            prev_id,
            batch_size,
            user.id
        );
        return await Promise.all(
            orders.map(async (orderData) => {
                const order = new Order(orderData);
                return await order.serializeForUser(user, user_type);
            })
        );
    }

    static async listSoldOrders(prev_id = 0, batch_size = 16, user, user_type) {
        const orders = await OrderStorage.listSoldOrders(
            prev_id,
            batch_size,
            user.id
        );

        return await Promise.all(
            orders.map(async (orderData) => {
                const order = new Order(orderData);
                return await order.serializeForUser(user, user_type);
            })
        );
    }

    async updateDocument(user, file) {
        const file_path = await this.getDocument(user);

        if (file_path === null)
            return await this.createDocument(user, file);

        const file_name = path.parse(file_path).base;
        return await this.changeDocument(user, file_name, file_path, file);
    }

    async changeDocument(user, file_name, file_path, file) {
        const {originalname} = file;
        const new_extension = path.extname(originalname).toLowerCase();

        await fsPromises.unlink(file_path);
        const new_file_path = `${file_path
            .slice(0, -(path.extname(file_name).length))}${new_extension}`;
        await fsPromises.writeFile(new_file_path, file.buffer);

        if (await user.hasPermission(PERMISSIONS.ADMIN)) {
            return await OrderStorage.updateDocument(
                this.id,
                `admin${new_extension}`,
                true
            );
        }
        return await OrderStorage.updateDocument(
            this.id,
            `user${new_extension}`
        );
    }

    async createDocument(user, file) {
        const is_admin  = await user.hasPermission(PERMISSIONS.ADMIN);
        const {originalname} = file;
        const extension = path.extname(originalname).toLowerCase();
        const full_id = String(this.id).padStart(8, "0");
        const dir_path = path.join(
            __dirname,
            `../../../static/orders/${full_id}`
        );

        if (!(await FilesystemManager.exists(dir_path)))
            await fsPromises.mkdir(dir_path, {recursive: true});

        const file_path = path.join(
            dir_path,
            `${is_admin ? "admin" : "user"}${extension}`
        );
        await fsPromises.writeFile(file_path, file.buffer);
        if (is_admin)
            return await OrderStorage.updateDocument(
                this.id,
                `admin${extension}`,
                true
            );
        return await OrderStorage.updateDocument(
            this.id,
            `user${extension}`
        );
    }

    static async getById(id) {
        const data = await OrderStorage.getById(id);

        if (!data)
            return null;

        return new Order(data);
    }

    async update(data) {
        const LAST_UPDATE_CHANGING_FIELDS = [
            "status",
            "comment_admin",
            "comment_user",
        ];

        LAST_UPDATE_CHANGING_FIELDS.forEach((field) => {
            if (data[field] === undefined || data[field] === null)
                delete data[field];
            if (data[field] === "RECEIVED" && field == "status")
                data["korvin_reception_date"] = new Date();
        });

        if (Object.keys(data).length === 0) {
            return;
        }
        return await OrderStorage.updateById(this.id, data);
    }

    async getDocument(user) {
        let file_name = await OrderStorage.getDocument(
            this.id,
            await user.hasPermission(PERMISSIONS.ADMIN)
        );

        if (!file_name)
            return null;

        const full_id = String(this.id).padStart(8, "0");
        return path.join(
            __dirname,
            `../../../static/orders/${full_id}`,
            file_name
        );
    }

    async getByProductId(product_id) {
        const data = await OrderStorage.getByProductId(product_id);

        return data ? new Order(data) : null;
    }
}

module.exports = Order;
