'use strict';

var collections	= require('*/cartridge/scripts/util/collections');
var Transaction	= require('dw/system/Transaction');
var moneiAPI = require('*/cartridge/scripts/monei/moneiAPI');
var moneiHelper = require('*/cartridge/scripts/helpers/moneiHelper');
var Resource = require('dw/web/Resource');

const PAYMENT_ID = 'MONEI_PAYMENTREQUEST';

function Handle(basket, paymentInformation) {
    var currentBasket = basket;
    var error = false;
    var serverErrors = [];

    Transaction.wrap(function () {
        var paymentInstruments = currentBasket.getPaymentInstruments();
        collections.forEach(paymentInstruments, function (item) {
            currentBasket.removePaymentInstrument(item);
        });

        currentBasket.createPaymentInstrument(PAYMENT_ID, currentBasket.totalGrossPrice);

        var result = moneiAPI.createPayment(moneiHelper.createPaymentPayload(basket, paymentInformation));
        if (result && !Object.prototype.hasOwnProperty.call(result, 'err')) {
            currentBasket.custom.moneiToken = paymentInformation.moneiToken.value.toString();
            currentBasket.custom.moneiSessionID = paymentInformation.moneiSessionID.value.toString();
            currentBasket.custom.moneiOrderNo = result.orderId;
            currentBasket.paymentInstrument.custom.moneiPaymentID = result.id;
        } else {
            error = true;
            if (Object.prototype.hasOwnProperty.call(result, 'err')) {
                serverErrors.push(result.err);
            } else {
                serverErrors.push(Resource.msg('monei.error.general', 'moneierrors', null));
            }
        }
    });

    return { fieldErrors: {}, serverErrors: serverErrors, error: error };
}

function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
    var Resource = require('dw/web/Resource');
    var OrderMgr = require('dw/order/OrderMgr');
    var serverErrors = [];
    var error = false;

    try {
        var order = OrderMgr.getOrder(orderNumber);
        var orderTotal = order.totalGrossPrice;
        Transaction.wrap(function () {
            paymentInstrument.paymentTransaction.setTransactionID(order.orderNo);
            paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
            paymentInstrument.paymentTransaction.setAmount(orderTotal);
        });
    } catch (e) {
        error = true;
        serverErrors.push(
            Resource.msg('error.technical', 'checkout', null)
        );
    }

    return { fieldErrors: {}, serverErrors: serverErrors, error: error };
}

exports.Handle = Handle;
exports.Authorize = Authorize;
