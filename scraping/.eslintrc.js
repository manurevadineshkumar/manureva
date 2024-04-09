module.exports = {
    env: {
        node: true,
        es2021: true
    },
    extends: "eslint:recommended",
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
    },
    ignorePatterns: "tests",
    rules: {
        "max-len": [
            "warn",
            {"code": 120}
        ],
        indent: ["error", 4],
        "no-multiple-empty-lines": ["error", {"max": 1}],
        "eol-last": ["error", "always"],
        "no-trailing-spaces": ["error"],
        "linebreak-style": ["error", "unix"],
        quotes: ["error", "double", {allowTemplateLiterals: true}],
        semi: ["error", "always"],
        "object-curly-spacing": ["error", "never"],
        "space-infix-ops": ["error"],
        "no-debugger": "error",
        "no-console": [
            "error",
            {"allow": ["warn", "error", "info", "debug"]}
        ],
        "no-unused-vars": [
            "error",
            {
                argsIgnorePattern: "^_",
                ignoreRestSiblings: true
            }
        ]
    }
};
