'use strict';

var path = require('path');
var ExtractTextPlugin = require('sgmf-scripts')['extract-text-webpack-plugin'];
var jsFiles = require('sgmf-scripts').createJsPath();
var scssFiles = require('sgmf-scripts').createScssPath();

module.exports = [{
    mode: 'production',
    name: 'js',
    entry: jsFiles,
    output: {
        path: path.resolve('./cartridges/int_monei_sfra/cartridge/static'),
        filename: '[name].js'
    }
}, {
    mode: 'none',
    name: 'scss',
    entry: scssFiles,
    output: {
        path: path.resolve('./cartridges/int_monei_sfra/cartridge/static'),
        filename: '[name].css'
    },
    module: {
        rules: [{
            test: /\.scss$/,
            use: ExtractTextPlugin.extract({
                use: [{
                    loader: 'css-loader',
                    options: {
                        url: false,
                        minimize: true
                    }
                }, {
                    loader: 'postcss-loader',
                    options: {
                        plugins: [
                            require('autoprefixer')()
                        ]
                    }
                }, {
                    loader: 'sass-loader',
                    options: {
                        includePaths: [
                            path.resolve('node_modules')
                        ]
                    }
                }]
            })
        }]
    },
    plugins: [
        new ExtractTextPlugin({ filename: '[name].css' })
    ]
}];
