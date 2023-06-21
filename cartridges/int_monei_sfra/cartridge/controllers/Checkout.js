'use strict';

var moneiHelper = require('*/cartridge/scripts/helpers/moneiHelper');
var server = require('server');

server.extend(module.superModule);

server.append('Begin', function (req, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var viewData = res.getViewData();

    viewData.monei = {
        prefs: moneiHelper.getPreferences(),
        data: moneiHelper.getOrderData(viewData.order),
        locale: moneiHelper.getCurrentLanguage(req.locale),
        dataEndpoint: URLUtils.url('Monei-orderData').toString(),
        createOrderEndpoint: URLUtils.url('Monei-createOrder').toString(),
        placeOrderEndpoint: URLUtils.url('Monei-placeOrder').toString(),
        failOrderEndpoint: URLUtils.url('Monei-failOrder').toString(),
        cartEndpoint: URLUtils.url('Cart-Show').toString()
    };

    res.setViewData(viewData);
    next();
});

module.exports = server.exports();
