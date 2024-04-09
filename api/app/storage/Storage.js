const mysql = require("mysql");

class Storage {
    static pool = null;

    static connect(params = {}) {
        if (Storage.pool)
            return;

        const env = process.env;

        Storage.pool = mysql.createPool(Object.assign({
            connectionLimit:    env.DB_CONNECTION_POOL_SIZE,
            host:               env.DB_HOST,
            user:               env.DB_USER,
            port:               env.DB_PORT || 3306,
            password:           env.DB_PASSWORD,
            database:           env.DB_DATABASE,
            multipleStatements: true
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

    static async runTransaction(callback) {
        const connection = await new Promise((resolve, reject) =>
            Storage.pool.getConnection((err, connection) =>
                err
                    ? reject(err)
                    : resolve(connection)
            )
        );
        const query = (sql, ...args) => new Promise((resolve, reject) => {
            connection.query(sql, args, (err, result) => {
                if (err)
                    return reject(err);

                console.debug("Result:", result);

                resolve(result);
            });
        });

        try {
            await query("BEGIN");
            const result = await callback(query);
            await query("COMMIT");

            return result;
        } finally {
            connection.release();
        }
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

    static async stop() {
        if (!Storage.pool)
            return;

        await new Promise(resolve => Storage.pool.end(resolve));
        Storage.pool = null;
    }

    static escapeLike(str) {
        return str
            .replaceAll("\\", "\\\\")
            .replaceAll("%", "\\%")
            .replaceAll("_", "\\_");
    }
}

module.exports = Storage;
