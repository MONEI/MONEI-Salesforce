'use strict';

var collections	= require('*/cartridge/scripts/util/collections');
var Transaction	= require('dw/system/Transaction');
var moneiAPI = require('*/cartridge/scripts/monei/moneiAPI');
var moneiHelper = require('*/cartridge/scripts/helpers/moneiHelper');

const PAYMENT_ID = "MONEI_BIZUM";

/**
 * simple hook for bizum processing
 * @return {Object} an object that contains standard valid information
 */
function Handle(basket, paymentInformation, paymentMethodID, req) {
	var currentBasket = basket;
    var error = false;

    Transaction.wrap(function () {
        var paymentInstruments = currentBasket.getPaymentInstruments(PAYMENT_ID);
        collections.forEach(paymentInstruments, function (item) {
            currentBasket.removePaymentInstrument(item);
        });

        currentBasket.createPaymentInstrument(PAYMENT_ID, currentBasket.totalGrossPrice);

        var result = moneiAPI.createPayment(moneiHelper.createPaymentPayload(basket, paymentInformation));
        if (result) {
            currentBasket.custom.moneiToken = paymentInformation.moneiToken.value.toString();
            currentBasket.custom.moneiSessionID = paymentInformation.moneiSessionID.value.toString();
            currentBasket.custom.moneiOrderNo = result.orderId;
            currentBasket.paymentInstruments[0].custom.moneiPaymentID = result.id;
        } else {
            error = true;
        }
    });

    return { fieldErrors: {}, serverErrors: [], error: error }
}

/**
 * simple hook for bizum processing
 * @return {Object} an object that contains standard valid information
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
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
