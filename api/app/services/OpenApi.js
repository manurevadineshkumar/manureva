const HttpError = require("../errors/HttpError");

class OpenApi {
    static #SCHEMA_PREFIX = "#/components/schemas/";

    static #VALIDATORS = {
        "boolean": OpenApi.validateBooleanField,
        "string":  OpenApi.validateStringField,
        "number":  OpenApi.validateNumberField,
        "integer": OpenApi.validateIntegerField,
        "array":   OpenApi.validateArrayField,
        "object":  OpenApi.validateObjectField
    };

    constructor(specification, operations) {
        this.specification = JSON.parse(JSON.stringify(specification));
        this.operations    = operations;
    }

    #setupRefSchema(schema, stack) {
        const ref = schema.$ref;

        if (stack[ref])
            throw new Error("detected circular $ref links");

        delete schema.$ref;

        Object.assign(schema, this.#getSchemaByRef(ref));

        return this.#setupSchema(schema, ref, {...stack, [ref]: 1});
    }

    #setupObjectSchema(schema, ref, stack) {
        Object.values(schema?.properties || {}).forEach(prop => {
            return this.#setupSchema(prop, ref, stack);
        });

        if (Array.isArray(schema.required)) {
            schema.required.forEach(name => {
                if (!schema.properties[name])
                    throw new Error(`invalid required property "${name}"`);

                schema.properties[name].required = true;
            });

            delete schema.required;
        }
    }

    #setupSchema(schema, ref, stack = {}) {
        if (schema.$ref)
            return this.#setupRefSchema(schema, stack);
        if (schema.type == "object")
            return this.#setupObjectSchema(schema, ref, stack);
        if (schema.type == "array")
            return this.#setupSchema(schema?.items || {}, ref, stack);
    }

    static #findByRef(object, path) {
        const [name, ...remaining_path] = path;

        if (!name)
            return object;

        if (object[name])
            return this.#findByRef(object[name], remaining_path);

        throw new Error(`unknown reference ${name}`);
    }

    #getSchemaByRef(ref) {
        if (!ref.startsWith(OpenApi.#SCHEMA_PREFIX))
            throw new Error(
                `"${ref}": schema reference must start by `
                + `"${OpenApi.#SCHEMA_PREFIX}"`
            );

        try {
            return OpenApi.#findByRef(
                this.schemas,
                ref.substring(OpenApi.#SCHEMA_PREFIX.length).split("/")
            );
        } catch (err) {
            throw new Error(`invalid schema "${ref}": ${err.message}`);
        }
    }

    #setupComponents(components) {
        this.components = components || {};

        this.securitySchemes = this.components.securitySchemes || {};
        this.schemas = this.components.schemas || {};

        Object.entries(this.schemas).forEach(([name, schema]) => {
            const path = OpenApi.#SCHEMA_PREFIX + name;

            this.#setupSchema(schema, path, {[path]: 1});
        });
    }

    #setupPaths(paths) {
        this.paths = paths;

        Object.values(this.paths).forEach(methods => {
            Object.values(methods).forEach(method => {
                if (!this.operations[method.operationId])
                    throw new Error(
                        `operation "${method.operationId}" is not implemented`
                    );

                method.parameters?.forEach(param => {
                    if (param.required)
                        param.schema.required = true;
                    this.#setupSchema(param.schema, "");
                });

                Object.values(
                    method.requestBody?.content || {}
                ).forEach(content_type => {
                    this.#setupSchema(content_type?.schema || {}, "");
                });
            });
        });
    }

    load() {
        const {paths, components} = this.specification;

        this.#setupComponents(components);
        this.#setupPaths(paths);
    }

    getOperation(path, method) {
        const operation_id = this.paths[path]?.[method]?.operationId;
        const is_public = this.paths[path][method]?.security?.length === 0;

        if (operation_id === undefined)
            throw new HttpError(405);

        return {
            is_public,
            handler: this.operations[operation_id]
        };
    }

    #getParams(spec, query, path) {
        const result = {query: {}, path: {}};

        if (!spec)
            return result;

        spec.forEach(({name, ...param}) => {
            if (param.in == "query")
                result.query[name] = OpenApi.validateSchema(
                    name, query[name], param.schema
                );
            if (param.in == "path")
                result.path[name] = OpenApi.validateSchema(
                    name, path[name], param.schema
                );
        });

        return result;
    }

    #getBody(spec, body) {
        const schema = spec?.content?.["application/json"]?.schema?.properties;

        if (!schema)
            return {};
        return Object.fromEntries(
            Object.entries(schema).map(([key, val]) => ([
                key,
                OpenApi.validateSchema(key, body[key], val)
            ]))
        );
    }

    #getFiles(spec, files) {
        const schema = spec?.content?.["multipart/form-data"]?.schema
            ?.properties;

        if (!schema)
            return {};

        const result = Object.fromEntries(Object.entries(schema).map(
            ([key, {type}]) => [key, type == "array" ? [] : null]
        ));

        if (!files)
            throw new HttpError(400, "missing files");

        files.forEach(({fieldname, ...fields}) => {
            if (result[fieldname] === null)
                result[fieldname] = fields;
            if (Array.isArray(result[fieldname]))
                result[fieldname].push(fields);
        });

        return result;
    }

    getData(route, method, request) {
        const operation = this.paths[route][method];

        const {query, path} = this.#getParams(
            operation.parameters,
            request.query,
            request.params
        );

        return {
            path,
            query,
            body: this.#getBody(operation.requestBody, request.body),
            files: this.#getFiles(operation.requestBody, request.files)
        };
    }

    static validateValueType(key, value, schema) {
        if (
            schema.type && typeof value != schema.type
            && schema.type != "boolean"
            && (schema.type != "array" || !Array.isArray(value))
            && (
                schema.type != "number" && schema.type != "integer"
                || isNaN(value)
            )
        )
            throw new HttpError(
                400,
                `field "${key}" must be of type "${schema.type}" `
                + `(got "${typeof value}")`
            );
    }

    static validateSchema(key, value, schema) {
        if (value === undefined && schema.default !== undefined)
            value = schema.default;
        if (value === undefined && schema.required)
            throw new HttpError(400, `missing required field "${key}"`);
        if (value === undefined)
            return undefined;
        if (value === null) {
            if (!schema.nullable)
                throw new HttpError(400, `field "${key}" cannot be null`);
            return null;
        }
        if (Array.isArray(schema.enum) && !schema.enum.includes(value))
            throw new HttpError(
                400, `field "${key}" must be one of: ` + schema.enum.join(", ")
            );

        OpenApi.validateValueType(key, value, schema);

        const validator = OpenApi.#VALIDATORS[schema.type];

        return validator ? validator(key, value, schema) : value;
    }

    static validateBooleanField(name, value) {
        return isNaN(value) ? !!value : !!+value;
    }

    static validateStringField(name, value, {minLength, maxLength}) {
        if (minLength && value.length < minLength)
            throw new HttpError(
                400,
                `field "${name}" must be at least ${minLength} chars long`
            );
        if (maxLength && value.length > maxLength)
            throw new HttpError(
                400,
                `field "${name}" must be at most ${maxLength} chars long`
            );
        return value;
    }

    static validateNumberField(name, value, {minimum, maximum}) {
        if (minimum && +value < minimum)
            throw new HttpError(
                400,
                `field "${name}" must be at least ${minimum}`
            );
        if (maximum && +value > maximum)
            throw new HttpError(
                400,
                `field "${name}" must be at most ${maximum}`
            );
        return +value;
    }

    static validateIntegerField(name, value, constraints) {
        if (value % 1)
            throw new HttpError(400, `field "${name}" must be a whole number`);

        return OpenApi.validateNumberField(name, value, constraints);
    }

    static validateArrayField(
        name,
        array,
        {minLength, maxLength, uniqueItems, items}
    ) {
        if (minLength && array.length < minLength)
            throw new HttpError(
                400,
                `field "${name}" must have at least ${minLength} items`
            );

        if (maxLength && array.length > maxLength)
            throw new HttpError(
                400,
                `field "${name}" must have at most ${maxLength} items`
            );

        if (
            uniqueItems
            && new Set(items.map(JSON.stringify)).size != array.length
        )
            throw new HttpError(
                400,
                `field "${name}" must not contain duplicate items`
            );

        return array.map((obj, i) => OpenApi.validateSchema(
            `${name}[${i}]`,
            array[i],
            items || {}
        ));
    }

    static validateObjectField(name, obj, {properties}) {
        return properties
            ? Object.fromEntries(
                Object.entries(properties || {}).map(
                    ([key, constraints]) => ([key, OpenApi.validateSchema(
                        `${name}["${key}"]`,
                        obj[key],
                        constraints
                    )])
                )
            )
            : obj;
    }
}

module.exports = OpenApi;
