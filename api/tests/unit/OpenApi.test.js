const assert = require("assert");

const OpenApi = require("../../app/services/OpenApi");

describe("OpenApi", function() {
    describe("OpenApi#setup()", function() {
        it("detects a loop in schemas", function() {
            const openapi = new OpenApi(
                {
                    components: {
                        schemas: {
                            "A": {
                                "type": "object",
                                "properties": {
                                    "b": {
                                        "$ref": "#/components/schemas/B"
                                    }
                                }
                            },
                            "B": {
                                "type": "object",
                                "properties": {
                                    "b": {
                                        "$ref": "#/components/schemas/C"
                                    }
                                }
                            },
                            "C": {
                                "type": "object",
                                "properties": {
                                    "b": {
                                        "$ref": "#/components/schemas/A"
                                    }
                                }
                            }
                        }
                    }
                },
                []
            );

            assert.throws(() => openapi.load());
        });
        it("detects an unknown reference", function() {
            const openapi = new OpenApi(
                {
                    components: {
                        schemas: {
                            "B": {
                                "type": "object",
                                "properties": {
                                    "b": {
                                        "$ref": "#/components/schemas/C"
                                    }
                                }
                            }
                        }
                    }
                },
                []
            );

            assert.throws(() => {
                openapi.load();
            });
        });
        it("detects an invalid reference", function() {
            const openapi = new OpenApi(
                {
                    components: {
                        schemas: {
                            "A": {
                                "type": "object",
                                "properties": {
                                    "b": {
                                        "$ref": "#/my/ass/B"
                                    }
                                }
                            }
                        }
                    }
                },
                []
            );

            assert.throws(() => {
                openapi.load();
            });
        });
        it("detects a missing controller", function() {
            const openapi = new OpenApi(
                {
                    paths: {
                        "/": {
                            "get": {
                                "operationId": "noOp"
                            }
                        }
                    },
                    components: {
                        schemas: {
                            "A": {
                                "type": "object"
                            },
                            "B": {
                                "type": "array"
                            }
                        }
                    }
                },
                []
            );

            assert.throws(() => {
                openapi.load();
            });
        });
        it("detects a missing operation", function() {
            const openapi = new OpenApi(
                {
                    paths: {
                        "/": {
                            "get": {
                                "operationId": "noOp"
                            }
                        }
                    }
                },
                {noOp: () => {}}
            );

            openapi.load();

            assert.throws(() => {
                openapi.getOperation("/", "post");
            });
        });
    });
    describe("OpenApi#validateStringField()", function() {
        it("processes a valid string", function() {
            assert.strictEqual(OpenApi.validateStringField(
                "some_string",
                "FooBar",
                {}
            ), "FooBar");
        });
        it("processes a valid string with constraints", function() {
            assert.strictEqual(OpenApi.validateStringField(
                "some_string",
                "FooBar",
                {minLength: 6, maxLength: 6}
            ), "FooBar");
        });
        it("rejects a too short string", function() {
            assert.throws(() => OpenApi.validateStringField(
                "some_string",
                "foo",
                {minLength: 4}
            ));
        });
        it("rejects a too long string", function() {
            assert.throws(() => OpenApi.validateStringField(
                "some_string",
                "foo",
                {maxLength: 2}
            ));
        });
    });
    describe("OpenApi#validateNumberField()", function() {
        it("processes a valid number", function() {
            assert.strictEqual(OpenApi.validateNumberField(
                "some_number",
                42.21,
                {}
            ), 42.21);
        });
        it("processes a valid number with constraints", function() {
            assert.strictEqual(OpenApi.validateNumberField(
                "some_number",
                42,
                {minimum: 42, maximum: 42}
            ), 42);
        });
        it("rejects a too small number", function() {
            assert.throws(() => OpenApi.validateNumberField(
                "some_number",
                123,
                {minimum: 124}
            ));
        });
        it("rejects a too large number", function() {
            assert.throws(() => OpenApi.validateNumberField(
                "some_number",
                123,
                {maximum: 122}
            ));
        });
    });
    describe("OpenApi#validateIntegerField()", function() {
        it("processes a valid number with constraints", function() {
            assert.strictEqual(OpenApi.validateIntegerField(
                "some_number",
                42,
                {minimum: 42, maximum: 42}
            ), 42);
        });
        it("rejects a float number", function() {
            assert.throws(() => OpenApi.validateIntegerField(
                "some_number",
                42.24,
                {}
            ));
        });
    });
    describe("OpenApi#validateArrayField()", function() {
        it("processes an array with random types", function() {
            const array = [1, 2, 3, "foo", "bar", {}];

            assert.deepStrictEqual(OpenApi.validateArrayField(
                "some_array",
                array,
                {}
            ), array);
        });
        it("processes an array with same type", function() {
            const array = [1, 2, 3, -42, 12.34, 0, 101010];

            assert.deepStrictEqual(OpenApi.validateArrayField(
                "some_array",
                array,
                {}
            ), array);
        });
        it("processes nested arrays with constraints", function() {
            const array = [
                [
                    [0],
                    [1, 2],
                    [3, 4, 5]
                ], [
                    [],
                    [6, 7, 8],
                    [9]
                ]
            ];

            assert.deepStrictEqual(OpenApi.validateArrayField(
                "some_array",
                array,
                {
                    items: {
                        type: "array",
                        items: {
                            type: "array",
                            items: {
                                type: "number",
                                minimum: 0,
                                maximum: 9
                            }
                        }
                    }
                }
            ), array);
        });
        it("rejects an array with an invalid type", function() {
            assert.throws(() => OpenApi.validateArrayField(
                "some_array",
                ["foo", "bar", [], "buzz"],
                {items: {type: "string"}}
            ));
        });
        it("rejects a too short array", function() {
            assert.throws(() => OpenApi.validateArrayField(
                "some_array",
                ["foo", "bar", "buzz"],
                {minLength: 4}
            ));
        });
        it("rejects a too long array", function() {
            assert.throws(() => OpenApi.validateArrayField(
                "some_array",
                ["foo", "bar", "buzz"],
                {maxLength: 2}
            ));
        });
        it("rejects a non unique array", function() {
            assert.throws(() => OpenApi.validateArrayField(
                "some_array",
                ["foo", "foo", "bar"],
                {uniqueItems: true}
            ));
        });
        it("rejects an array with an invalid nested type", function() {
            const array = [
                [
                    [0],
                    [1, 2],
                    [3, 4, 5]
                ], [
                    [],
                    [6, {}, 8],
                    [9]
                ]
            ];

            assert.throws(() => OpenApi.validateArrayField(
                "some_array",
                array,
                {
                    items: {
                        type: "array",
                        items: {
                            type: "array",
                            items: {
                                type: "number",
                                minimum: 0,
                                maximum: 9
                            }
                        }
                    }
                }
            ));
        });
        it("rejects an array with invalid nesting", function() {
            const array = [
                [
                    [0],
                    1,
                    2,
                    [3, 4, 5]
                ], [
                    [],
                    [6, 7, 8],
                    [9]
                ]
            ];

            assert.throws(() => OpenApi.validateArrayField(
                "some_array",
                array,
                {
                    items: {
                        type: "array",
                        items: {
                            type: "array",
                            items: {
                                type: "number",
                                minimum: 0,
                                maximum: 9
                            }
                        }
                    }
                }
            ));
        });
    });
    describe("OpenApi#validateObjectField()", function() {
        it("processes an object without parameters", function() {
            const obj = {
                a: 1,
                b: "foo",
                c: ["bar"],
                d: null
            };

            assert.deepStrictEqual(OpenApi.validateObjectField(
                "some_object",
                obj,
                {}
            ), obj);
        });
        it("processes an object with random types", function() {
            const obj = {
                a: 1,
                b: "foo",
                c: ["bar"]
            };

            assert.deepStrictEqual(OpenApi.validateObjectField(
                "some_object",
                obj,
                {properties: {a: {}, b: {}, c: {}}}
            ), obj);
        });
        it("filters out unspecified items", function() {
            assert.deepStrictEqual(OpenApi.validateObjectField(
                "some_object",
                {
                    js: "<3",
                    python: ":)",
                    haskell: "*_*"
                },
                {properties: {js: {}, python: {}}}
            ), {
                js: "<3",
                python: ":)"
            });
        });
        it("processes an object with consistent types", function() {
            const obj = {
                foo: "foo",
                bar: "bar",
                buzz: "buzz"
            };

            assert.deepStrictEqual(OpenApi.validateObjectField(
                "some_object",
                obj,
                {
                    properties: {
                        foo: {type: "string"},
                        bar: {type: "string"},
                        buzz: {type: "string"}
                    }
                }
            ), obj);
        });
        it("processes nested objects with constraints", function() {
            const obj = {
                a: 42,
                b: {
                    foo: {
                        bar: "buzz"
                    }
                },
                c: []
            };

            assert.deepStrictEqual(OpenApi.validateObjectField(
                "some_object",
                obj,
                {
                    properties: {
                        a: {type: "number", maximum: 42},
                        b: {type: "object", properties: {
                            foo: {type: "object", properties: {
                                bar: {type: "string", minLength: 4}
                            }}
                        }},
                        c: {type: "array", maxLength: 0}
                    }
                }
            ), obj);
        });
        it("rejects an object with an invalid value type", function() {
            assert.throws(() => OpenApi.validateObjectField(
                "some_object",
                {foo: "foo", bar: "bar", buzz: 42},
                {
                    properties: {
                        foo: {type: "string"},
                        bar: {type: "string"},
                        buzz: {type: "string"}
                    }
                }
            ));
        });
        it("rejects an object with an unsatisfied constraint", function() {
            assert.throws(() => OpenApi.validateObjectField(
                "some_object",
                {foo: "foo", bar: "bar", buzz: "buzz"},
                {
                    properties: {
                        foo: {type: "string", maxLength: 3},
                        bar: {type: "string", maxLength: 3},
                        buzz: {type: "string", maxLength: 3}
                    }
                }
            ));
        });
        it(
            "rejects an object with an unsatisfied nested constraint",
            function() {
                assert.throws(() => OpenApi.validateObjectField(
                    "some_object",
                    {
                        foo: "foo",
                        bar: 42,
                        buzz: {
                            bizz: {
                                bazz: "boozz"
                            }
                        }
                    },
                    {
                        properties: {
                            foo: {type: "string"},
                            bar: {type: "number"},
                            buzz: {
                                type: "object",
                                properties: {
                                    bizz: {
                                        type: "object", properties: {
                                            bazz: {
                                                type: "string", maxLength: 4
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                ));
            }
        );
    });
    describe("OpenApi#validateSchema()", function() {
        it("detects missing required field", function() {
            assert.throws(() => {
                OpenApi.validateSchema(
                    "",
                    undefined,
                    {
                        required: true
                    }
                );
            })
        });
        it("validates basic items #0", function() {
            const data = {
                fourty_two: 42,
                long_string: "Abracadabra",
                empty_array: [],
                random_object: {foo: "bar"},
                some_boolean: true
            };

            assert.deepStrictEqual(OpenApi.validateSchema(
                "",
                data,
                {
                    fourty_two: {type: "number", minimum: 42, maximum: 42},
                    long_string: {type: "string", minLength: 10},
                    empty_array: {type: "array"},
                    random_object: {type: "object", properties: {foo: {}}},
                    some_boolean: {type: "boolean"}
                }
            ), data);
        });
        it("validates basic items #1", function() {
            const data = {
                float_number: 42.24,
                eleven_chars: "11 chacters",
                long_array: Array(42).fill(0),
                simple_object: {a: ["A"], b: 0, c: {}},
                another_boolean: false
            };

            assert.deepStrictEqual(OpenApi.validateSchema(
                "",
                data,
                {
                    float_number: {
                        type: "number",
                        minimum: 42.2,
                        maximum: 42.3
                    },
                    eleven_chars: {
                        type: "string",
                        minLength: 11,
                        maxLength: 11
                    },
                    long_array: {type: "array"},
                    simple_object: {
                        type: "object",
                        properties: {
                            a: {type: "array"},
                            b: {},
                            c: {type: "object"}
                        }
                    },
                    another_boolean: {type: "boolean"}
                }
            ), data);
        });
        it("validates arrays in objects", function() {
            const data = {
                obj: {
                    arr: [0, 1, 2, 3],
                    obj_a: {
                        arr: [
                            "Ha", "ha", "ha", "ha",
                            "Stayin' alive", "Stayin' alive"
                        ]
                    },
                    obj_b: {
                        obj: {
                            arr: [
                                "Ha", "ha", "ha", "ha",
                                "Stayin' aliiiiive"
                            ]
                        }
                    }
                }
            };

            assert.deepStrictEqual(OpenApi.validateSchema(
                "",
                data,
                {
                    obj: {
                        properties: {
                            arr: {type: "array", minLength: 4},
                            obj_a: {type: "object", properties: {
                                arr: {type: "array", minLength: 4}
                            }},
                            obj_b: {type: "object", properties: {
                                obj_a: {type: "object", properties: {
                                    arr: {type: "array", minLength: 4}
                                }}
                            }},
                        }
                    }
                }
            ), data);
        });
        it("validates objects in arrays", function() {
            const data = {
                users: [
                    {username: "Jack Sparrow", status: "Captain Jack Sparrow"},
                    {username: "The missile", status: "knows where it is"},
                    {username: "C++", status: "segfaulting"},
                    {
                        username: "Ra-Ra-Rasputin",
                        status: "lover of the russian queen"
                    }
                ]
            };

            assert.deepStrictEqual(OpenApi.validateSchema(
                "",
                data,
                {
                    users: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                username: {type: "string", minLength: 2},
                                status: {type: "string", minLength: 16},
                            }
                        }
                    }
                }
            ), data);
        });
        it("validates mixed data", function() {
            const data = {
                magic_numbers: [13, -42, 666, 3.141592, 1.618],
                matrix: [
                    [1, 0, 0, 0],
                    [0, 1, 0, 0],
                    [0, 0, 1, 0],
                    [0, 0, 0, 1]
                ],
                js: [{is_the_best: true}],
                earth: {europe: {france: {paris: 42}}}
            };

            assert.deepStrictEqual(OpenApi.validateSchema(
                "",
                data,
                {
                    magic_numbers: {
                        type: "array",
                        items: {
                            type: "number",
                            minimum: -42,
                            maximum: 666
                        }
                    },
                    matrix: {
                        type: "array",
                        items: {
                            type: "array",
                            items: {
                                type: "number",
                                minimum: 0,
                                maximum: 1
                            }
                        }
                    },
                    js: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                is_the_best: {
                                    type: "boolean"
                                }
                            }
                        }
                    },
                    earth: {
                        type: "object",
                        properties: {
                            europe: {
                                type: "object",
                                properties: {
                                    france: {
                                        type: "object",
                                        properties: {
                                            paris: {
                                                type: "number",
                                                minimum: 42,
                                                maximum: 42
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ), data);
        });
    });
});
