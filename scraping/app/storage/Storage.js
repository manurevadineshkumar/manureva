const mysql = require("mysql");

class Storage {
    static pool = null;

    static connect(params = {}) {
        if (Storage.pool)
            return;

        const env = process.env;

        Storage.pool = mysql.createPool(Object.assign({
            connectionLimit:    env.CONNECTION_LIMIT,
            host:               env.DB_HOST,
            user:               env.DB_USER,
            port:               env.DB_PORT || 3306,
            password:           env.DB_PASSWORD,
            database:           env.DB_DATABASE,
            multipleStatements: true,
            timezone:           "utc"
        }, params));
    }

    static query(sql, ...values) {
        if (!Storage.pool)
            Storage.connect();

        console.debug("SQL query:", sql, values);

        return new Promise((resolve, reject) => {
            Storage.pool.query(sql, values, (err, result) => {
                if (err)
                    return reject(err);

                console.debug("Result:", result);

                resolve(result);
            });
        });
    }

    static querySilent(sql, ...values) {
        return new Promise((resolve, reject) => {
            Storage.pool.query(sql, values, (err, result) =>
                err
                    ? reject(err)
                    : resolve(result)
            );
        });
    }

    static escapeLike(str) {
        return str
            .replaceAll("\\", "\\\\")
            .replaceAll("%", "\\%")
            .replaceAll("_", "\\_");
    }
}

module.exports = Storage;
