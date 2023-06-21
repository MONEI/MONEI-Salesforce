'use strict';

var Locale = require('dw/util/Locale');
var OrderMgr = require('dw/order/OrderMgr');
var moneiHelper = require('*/cartridge/scripts/helpers/moneiHelper');
var moneiOrderHelper = require('*/cartridge/scripts/helpers/moneiOrderHelper');
var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');
var server = require('server');

server.post('orderData', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var OrderModel = require('*/cartridge/models/order');

    var currentLocale = Locale.getLocale(req.locale.id);

    var currentBasket = BasketMgr.getCurrentBasket();
    var orderModel = new OrderModel(
        currentBasket,
        {
            countryCode: currentLocale.country,
            containerView: 'basket'
        }
    );

    res.json({
        order: orderModel
    });

    next();
});

server.post('createOrder', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();
    var result = {
        error: true,
        orderId: null
    };

    result = moneiOrderHelper.createOrder(req, currentBasket);

    res.json({
        error: result.error,
        errorRedirectUrl: result.errorStage ? result.errorStage : null,
        errorMessage: result.errorMessage ? result.errorMessage : null,
        orderId: result.orderId,
        orderMoneiToken: result.orderMoneiToken ? result.orderMoneiToken : null,
        orderMoneiPaymentId: result.orderMoneiPaymentId ? result.orderMoneiPaymentId : null
    });

    next();
});

server.post('placeOrder', function (req, res, next) {
    var addressHelpers = require('*/cartridge/scripts/helpers/addressHelpers');
    var orderId = req.form.orderId;
    var result = {
        error: true,
        orderId: orderId
    };

    var order = OrderMgr.getOrder(orderId);
    if (order) {
        var currentLocale = Locale.getLocale(req.locale.id);
        if (req.currentCustomer.addressBook) {
            var allAddresses = addressHelpers.gatherShippingAddresses(order);
            allAddresses.forEach(function (address) {
                if (!addressHelpers.checkIfAddressStored(address, req.currentCustomer.addressBook.addresses)) {
                    addressHelpers.saveAddress(address, req.currentCustomer, addressHelpers.generateAddressName(address));
                }
            });
        }

        result = moneiOrderHelper.placeOrder(order, currentLocale, req.form.paymentResult ? req.form.paymentResult : null, true);
    }

    res.json({
        error: result.error,
        orderId: order ? order.orderNo : orderId,
        orderToken: order ? order.orderToken : null,
        continueUrl: URLUtils.url('Order-Confirm').toString()
    });

    next();
});

server.post('failOrder', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var result = {
        error: true,
        orderId: req.form.orderId,
        restoreBasket: req.form.restoreBasket ? req.form.restoreBasket : false
    };

    var order = OrderMgr.getOrder(req.form.orderId);
    if (order) {
        result = moneiOrderHelper.cancelOrFailOrder(order);
        if (!result) {
            var Transaction = require('dw/system/Transaction');
            session.custom.moneiErrorMessage = Resource.msg('error.technical', 'checkout', null);
            Transaction.wrap(function () {
                BasketMgr.createBasketFromOrder(order);
            });
        }
    }

    res.json({
        error: result,
        redirectUrl: URLUtils.url('Checkout-Begin', 'showMoneiError', true, 'stage', 'payment').toString()
    });

    next();
});

server.post('Callback', function (req, res, next) {
    var currentLocale = Locale.getLocale(req.locale.id);
    var result = moneiHelper.verifySignature(req.body, req.httpHeaders['monei-signature']);

    if (result && !result.error) {
        moneiOrderHelper.updateNotifiedOrder(result, currentLocale);
    }

    res.json({
        error: result && result.error ? result.error : true
    });

    next();
});

module.exports = server.exports();
