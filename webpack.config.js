const path = require("path");
const Uglify = require("uglifyjs-webpack-plugin");

module.exports = {
    entry: "./dist/Addon.js",
    target: "node",
    mode: "development",
    output: {
        path: path.resolve(__dirname, "./dist"),
        filename: "Raid.bundle.js",
        library: "lib",
        libraryTarget: "umd",
        umdNamedDefine: true,
        globalObject: "this"
    },
    plugins: [
        new Uglify()
    ],
    module: {
        rules: [
            {
                test: /\.node$/,
                use: 'node-loader'
            },
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    }
}