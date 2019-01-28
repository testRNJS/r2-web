//node webpack/bin/webpack.js -p

const webpack = require('webpack');
const path = require('path');
//const glob = require('glob');

const SRC_DIR = path.resolve(__dirname, 'src');
const DIST_DIR = path.resolve(__dirname, 'dist');

module.exports = {
    //entry: SRC_DIR + '\\jsx\\index.jsx'
    entry: SRC_DIR + '\\jsx\\index.m.jsx'
    //entry: [SRC_DIR + '\\js\\jsx\\index.jsx',SRC_DIR + '\\js\\jsx\\Thumbs.jsx']
    //entry:list_js
    //entry:[SRC_DIR + '\\js\\jsx\\index.jsx',SRC_DIR + '\\js\\__js.js']
    //,devtool: 'source-map'
    , output: {
        path: SRC_DIR,
        //filename: 'index.js'
        filename: 'index.m.js'
    }

    , module: {
        loaders: [
            /*{test : /\.jsx?$/,include : SRC_DIR,loader : 'babel-loader'} */

            { test: /\.js$/, loader: 'babel-loader', include: SRC_DIR, exclude: /node_modules/ }
            , { test: /\.jsx$/, loader: 'babel-loader', include: SRC_DIR, exclude: /node_modules/ }
            , { include: SRC_DIR, loader: 'babel-loader' }

        ]
    }
    , plugins: [

        new webpack.optimize.UglifyJsPlugin({
            include: /\.min\.js$/
            , minimize: true
            , compress: true
            , mangle: false
        })

    ]
    , target: 'web'

    , watch: true
    , watchOptions: {
        ignored: /node_modules/
    }

};


