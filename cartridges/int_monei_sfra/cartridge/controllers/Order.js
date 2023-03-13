'use strict';

var page = module.superModule;
var server = require('server');

const OrderMgr = require('dw/order/OrderMgr');

server.extend(page);

server.append('Confirm', function (req, res, next) {
    var { getMoneiPaymentInstrument } = require('../scripts/monei/helpers/paymentInstrumentHelper');
    var formatMoney = require('dw/util/StringUtils').formatMoney;
    var Money = require('dw/value/Money');

    var order = OrderMgr.getOrder(req.querystring.ID);
    var moneiPaymentInstrument = getMoneiPaymentInstrument(order);
    var currency = order.getCurrencyCode();

    if (!moneiPaymentInstrument) {
        next();
        return;
    }
    var amount = moneiPaymentInstrument.paymentTransaction.amount.value;
    var paymentAmount = formatMoney(new Money(amount, currency));
    res.setViewData({
        monei: {
            paymentAmount: paymentAmount
        }
    });
    next();
});

server.append('Details', function (req, res, next) {
    var order = OrderMgr.getOrder(req.querystring.orderID);
    res.setViewData({
        monei: {
            summaryEmail: null,
            currency: order.getCurrencyCode()
        }
    });
    next();
});

module.exports = server.exports();
