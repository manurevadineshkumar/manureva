const Mailer = require("./Mailer");
const ProductHelper = require("../business-services/product/helper/Product.helper");
const SlackLogger = require("./SlackLogger");

class OrderHandler {
    static RECLO_EMAILS = process.env.RECLO_ORDER_EMAILS?.split(",") || [];

    static VENDOR_HANDLERS = {
        "Reclo": OrderHandler.handleReclojpOrder
    };

    static LOCAL_TZ_OFFSET = (new Date).getTimezoneOffset() * 60e3;

    static TARGET_TZ_OFFSET = 9 * 60 * 60e3;

    static handleReclojpOrder(order) {
        const {product} = order;
        const price = product.boughtPriceDiscounted || product.boughtPrice;
        const price_str = "￥" +
            Intl.NumberFormat("en-US").format(Math.ceil(price / 1.1 * .9));
        const jp_time = new Date(
            (order.placementDate || Date.now())
            + OrderHandler.LOCAL_TZ_OFFSET
            + OrderHandler.TARGET_TZ_OFFSET
        );

        const variables = {
            id: "krvn" + ("" + product.id).padStart(8, "0"),
            year: jp_time.getFullYear(),
            month: (jp_time.getMonth() + 1 + "").padStart(2, "0"),
            day: (jp_time.getDate() + "").padStart(2, "0"),
            hours: (jp_time.getHours() + "").padStart(2, "0"),
            minutes: (jp_time.getMinutes() + "").padStart(2, "0"),
            seconds: (jp_time.getSeconds() + "").padStart(2, "0"),
            product_pd: product.originalUrl.split("/").slice(-1)[0],
            product_name: product.originalName,
            product_material: product.material,
            price_unit: price_str,
            product_count: 1,
            price_total: price_str
        };

        return Promise.all(OrderHandler.RECLO_EMAILS.map(
            email => OrderHandler.sendRecloMail(email, variables)
        ));
    }

    static sendRecloMail(email, variables) {
        return Mailer.sendMail({
            template_id: "reclojp",
            to: email,
            variables
        });
    }

    static async dispatch(order) {
        const {product} = order;

        const handler = OrderHandler.VENDOR_HANDLERS[product.vendor];

        if (!product || !handler)
            return;

        await handler(order);

        const purchasePriceCents = ProductHelper.getEffectivePurchasePrice(product);
        const wholesalePriceCents = ProductHelper.getEffectiveWholesalePrice(product);
        const retailPriceCents = ProductHelper.getEffectiveRetailPrice(product);

        void SlackLogger.sendMessage({
            channel_id: process.env.SLACK_ORDERS_CHANNEL_ID,
            text: `New ${product.vendor} order: `
                + `${SlackLogger.escape(product.name)} `
                + `(<${SlackLogger.escape(product.imageUrls[0])}|#`
                + `${product.id}>), `
                + [
                    purchasePriceCents,
                    wholesalePriceCents,
                    retailPriceCents
                ].map(price => price / 100 + "€").join(" / "),
            params: {mrkdwn: true}
        });
    }
}

module.exports = OrderHandler;
