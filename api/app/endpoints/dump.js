const path = require("path");

const HttpError = require("../errors/HttpError");

class Route {
    static SELLERS = {
        miinto: {
            token: "ky1XloIZiiQZm56R1ogrnjr0ygXtsnJi",
            filepath: path.join(__dirname, "../../data/miinto.tsv"),
            content_type: "text/tab-separated-values"
        },
        vestiaire: {
            token: "Fi5D3VQhU4dBI11RIjecJDH3fTbyLS2V",
            filepath: path.join(__dirname, "../../data/vestiaire.csv"),
            content_type: "text/csv"
        },
        jolicloset: {
            token: "pkRkOpiergBxtGACctEdLhz7DOp2xERj",
            filepath: path.join(__dirname, "../../data/jolicloset.csv"),
            content_type: "text/csv"
        },
        grailed: {
            token: "7a11922f55f7bc5df522f6ff183b265d",
            filepath: path.join(__dirname, "../../data/grailed.csv"),
            content_type: "text/csv"
        },
        openforvintage: {
            token: "08ed967e510618ba48a90975003e8e6f",
            filepath: path.join(__dirname, "../../data/openforvintage.csv"),
            content_type: "text/csv"
        },
        cxmp: {
            token: "YA1cGELIsj1SB6CGiHu2kj0OtQWmsFwr",
            filepath: path.join(__dirname, "../../data/cxmp.csv"),
            content_type: "text/csv"
        },
        yoox: {
            token: "EbFCE2793fE5106c238AbEE828bCCF99",
            filepath: path.join(__dirname, "../../data/yoox.csv"),
            content_type: "text/csv"
        },
        choose: {
            token: "x51zwrY0uWhQfWlU3mEIf7SKDVGfg9qR",
            filepath: path.join(__dirname, "../../data/choose.csv"),
            content_type: "text/csv"
        },
        guava: {
            token: "dWGTrVAAqMKYjvCevdd5mA3Us8lqm7E0",
            filepath: path.join(__dirname, "../../data/guava.csv"),
            content_type: "text/csv"
        }
    };

    static async dumpProducts({res, path: {seller}, query: {token}}) {
        const seller_data = Route.SELLERS[seller];

        if (seller_data?.token != token)
            throw new HttpError(401, "invalid seller or token");

        res.set("Content-Type", seller_data.content_type);

        await new Promise(resolve =>
            res.sendFile(seller_data.filepath, resolve)
        );

        return null;
    }
}

module.exports = Route;
