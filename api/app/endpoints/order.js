const path = require("path");

const Product = require("../models/Product");
const Order = require("../models/Order");

const {PERMISSIONS} = require("../models/Permissions");

const OrderHandler = require("../services/OrderHandler");

const HttpError = require("../errors/HttpError");

class Route {
    static async orderProduct({user, body: {product_id, channel_id}}) {
        await user.assertPermission(PERMISSIONS.ORDER_CREATE);

        const product = await Product.getById(product_id);

        if (!product)
            throw new HttpError(404, "no such product");

        const order = await Order.create({product, user, channel_id});

        await OrderHandler.dispatch(order);
        await product.update({status: "SOLD"});

        return {success: true};
    }

    static async listOrders({user, query: {user_type, prev_id, batch_size}}) {
        let orders;

        if (user_type === "buyer") {
            if (await user.hasPermission(PERMISSIONS.ADMIN)) {
                orders = await Order.listAll(prev_id, batch_size + 1);
            } else {
                await user.assertPermission(PERMISSIONS.ORDER_LIST_PURCHASES);
                orders = await Order.listBoughtOrders(
                    prev_id,
                    batch_size + 1,
                    user,
                    user_type
                );
            }
        } else {
            await user.assertPermission(PERMISSIONS.ORDER_LIST_SALES);
            orders = await Order.listSoldOrders(
                prev_id,
                batch_size + 1,
                user,
                user_type
            );
        }
        const isLastBatch = orders.length < batch_size + 1
            ? {is_last_batch: 1}
            : {};
        return {items: orders, ...isLastBatch};
    }

    static async updateOrderDocument({user, path: {id}, files: {file}}) {
        await user.assertPermission(PERMISSIONS.UPDATE_ORDER_DETAILS);
        const {size, originalname} = file[0];
        const validExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
        const extension = path.extname(originalname).toLowerCase();

        if (!validExtensions.includes(extension)) {
            throw new HttpError(400, "We accept only pdf, jpg, jpeg and png");
        }

        const MAX_FILE_SIZE = 1024 * 1024 * 5; // 5MB
        if (size > MAX_FILE_SIZE  || size < 1)
            throw new HttpError(
                400,
                "Empty or the file reached the limit of 5 MB"
            );

        const order = await Order.getById(id);

        if (!order)
            throw new HttpError(404, "No such order");

        await order.updateDocument(user, file[0]);

        return ({success: true});
    }

    static async getOrderDocument({res, user, path: {id}}) {
        await user.assertPermission(PERMISSIONS.READ_ORDER_DETAILS);
        const order = await Order.getById(id);

        if (!order)
            throw new HttpError(404, `Order with id ${id} not found`);

        const file_path = await order.getDocument(user);

        if (!file_path)
            throw new HttpError(404, "Document not found");

        res.type(path.parse(file_path).ext);
        await new Promise(resolve => res.sendFile(file_path, resolve));
    }

    static async updateOrderById({user, path: {id}, body: data}) {
        await user.assertPermission(PERMISSIONS.UPDATE_ORDER_DETAILS);
        const is_admin = await user.hasPermission(PERMISSIONS.ADMIN);
        const {status, comment_admin} = data;
        const order = await Order.getById(id);

        if (!order)
            throw new HttpError(404, `No such order with id ${id}`);

        if (!is_admin
                && (status || comment_admin || order.user.id !== user.id)) {
            throw new HttpError(403, "Forbidden");
        }

        await order.update(data);

        return {success: true};
    }
}

module.exports = Route;
