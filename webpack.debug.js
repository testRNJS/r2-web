// node webpack/bin/webpack.js -p

const webpack = require('webpack');
const path = require('path');

// const glob = require('glob');

const SRC_DIR = path.resolve(__dirname, 'src');
const DIST_DIR = path.resolve(__dirname, 'dist');

module.exports = {
    entry: SRC_DIR + '\\jsx\\index.jsx',

    devtool: 'source-map',
    output: {
        path: SRC_DIR + '\\dist',
        filename: 'index.js'
    },

    resolve: {
        extensions: ['*', '.js', '.jsx', '.scss'],
        /*
    alias: {
            Components: path.resolve(__dirname, 'src/Components/'),
            Actions: path.resolve(__dirname, 'src/Actions/'),
            */



    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /(node_modules|bower_components)/,
                loader: 'babel-loader'
            },
            {
                test: /\.(css|scss)$/,
                use: ['style-loader', 'css-loader', 'sass-loader']
            },
            {
                test: /\.svg$/,
                use: [
                    {
                        loader: 'babel-loader'
                    },
                    {
                        loader: 'react-svg-loader',
                        options: { jsx: true }
                    }
                ]
            }
        ]
    },
    /*
 ,module : {
    loaders : [
      {include: SRC_DIR,loader: "babel-loader"}
       ,{ test: /\.css$/, loader: ['style', 'css', 'sass', 'postcss-loader'], include : SRC_DIR+'\\css'}
       ,{ test: /\.css$/, loader: "style-loader!css-loader" }
       //,{test: /\.(png|gif|jpe?g)$/,loader: 'file?name=/img/[name].[ext]', include : SRC_DIR+'\\img'}
    ]
  }
  */
    plugins: [

    ],
    target: 'web',

    watch: true,
    watchOptions: {
	  ignored: /node_modules/
    }

};
