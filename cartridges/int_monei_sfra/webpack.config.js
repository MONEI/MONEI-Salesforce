var path = require('path');
var glob = require('glob');
var webpack = require('sgmf-scripts').webpack;
var ExtractTextPlugin = require('sgmf-scripts')['extract-text-webpack-plugin'];
var sgmfScripts = require('sgmf-scripts');
const cwd = process.cwd();
const shell = require('shelljs');

var bootstrapPackages = {
    Alert: 'exports-loader?Alert!bootstrap/js/src/alert',
    // Button: 'exports-loader?Button!bootstrap/js/src/button',
    Carousel: 'exports-loader?Carousel!bootstrap/js/src/carousel',
    Collapse: 'exports-loader?Collapse!bootstrap/js/src/collapse',
    // Dropdown: 'exports-loader?Dropdown!bootstrap/js/src/dropdown',
    Modal: 'exports-loader?Modal!bootstrap/js/src/modal',
    // Popover: 'exports-loader?Popover!bootstrap/js/src/popover',
    Scrollspy: 'exports-loader?Scrollspy!bootstrap/js/src/scrollspy',
    Tab: 'exports-loader?Tab!bootstrap/js/src/tab',
    // Tooltip: 'exports-loader?Tooltip!bootstrap/js/src/tooltip',
    Util: 'exports-loader?Util!bootstrap/js/src/util'
};

function createScssPath() {
    const result = {};
    const cssFiles = shell.ls(path.join(cwd, `./cartridge/client/**/scss/**/*.scss`));

    cssFiles.forEach(filePath => {
        const name = path.basename(filePath, '.scss');
        if (name.indexOf('_') !== 0) {
            let location = path.relative(path.join(cwd, `./cartridge/client/default/css`), filePath);
            location = location.substr(0, location.length - 5).replace('scss', 'css');
            result[location] = filePath;
        }
    });

    return result;
}


module.exports = [ {
    mode: 'production',
    name: 'js',
    entry: glob.sync('./cartridge/client/**/js/*.js').reduce(function(obj, el){
        obj[path.parse(el).name] = el;
        return obj
     },{}),
    output: {
        path: path.resolve('./cartridge/static/default/js/'),
        filename: '[name].js',
        sourceMapFilename: "[name].js.map"
    },
	devServer: {
        inline: false,
        contentBase: "./dist",
    },
    resolve: {
        alias: {
            jquery: path.resolve(__dirname, '../../../storefront-reference-architecture/node_modules/jquery'),
            bootstrap: path.resolve(__dirname, '../../../storefront-reference-architecture/node_modules/bootstrap'),
            lodash: path.resolve(__dirname, '../../../storefront-reference-architecture/node_modules/lodash')
        }
    },
    optimization: {
        minimize: true
    },
    devtool: "eval-source-map"
}, {
    mode: 'production',
    name: 'scss',
    entry: createScssPath(),
    output: {
        path: path.resolve('./cartridge/static/default/css/'),
        filename: '[name].css'
    },
    module: {
        rules: [{
            test: /\.scss$/,
            use: ExtractTextPlugin.extract({
                use: [{
                    loader: 'css-loader',
                    options: {
                        sourceMap: true,
                        url: false
                    }
                },{
                    loader: 'sass-loader',
                    options: {
                        sourceMap: true,
                        sassOptions: {
                            outputStyle: 'compressed',
                          },
                        includePaths: [
                            path.resolve(process.cwd(), '../../../storefront-reference-architecture/node_modules'),
                            path.resolve(process.cwd(), '../../../storefront-reference-architecture/node_modules/flag-icon-css/sass')
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