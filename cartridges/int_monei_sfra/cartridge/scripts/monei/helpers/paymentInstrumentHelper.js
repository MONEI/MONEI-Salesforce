'use strict';

var Transaction = require('dw/system/Transaction');
var Money = require('dw/value/Money');
var {
    moneiPaymentMethodId
} = require('../../../config/moneiPreferences');

/**
 * Calculates the amount to be payed by a non-gift certificate payment instrument based
 * on the given basket. The method subtracts the amount of all redeemed gift certificates
 * from the order total and returns this value.
 *
 * @param {Object} lineItemCtnr - LineIteam Container (Basket or Order)
 * @returns {dw.value.Money} non gift certificate amount
 */
function calculateNonGiftCertificateAmount(lineItemCtnr) {
    var giftCertTotal = new Money(0.0, lineItemCtnr.currencyCode);
    var gcPaymentInstrs = lineItemCtnr.getGiftCertificatePaymentInstruments();
    var iter = gcPaymentInstrs.iterator();
    var orderPI = null;

    while (iter.hasNext()) {
        orderPI = iter.next();
        giftCertTotal = giftCertTotal.add(orderPI.getPaymentTransaction().getAmount());
    }

    var orderTotal = lineItemCtnr.totalGrossPrice;
    var amountOpen = orderTotal.subtract(giftCertTotal);
    return amountOpen;
}

/**
 * Return Monei order payment instrument
 *
 * @param {dw.order.LineItemCtnr} basket - Basket
 * @returns {dw.order.OrderPaymentInstrument} payment instrument with id MONEI
 */
function getMoneiPaymentInstrument(basket) {
    var paymentInstruments = basket.getPaymentInstruments(moneiPaymentMethodId);
    return !empty(paymentInstruments) && paymentInstruments[0];
}

/**
 * Delete all Monei payment instruments from Basket
 *
 * @param {dw.order.LineItemCtnr} basket - Basket
 */
function removeMoneiPaymentInstrument(basket) {
    var paymentInstrument = basket.getPaymentInstruments(moneiPaymentMethodId);
    if (empty(paymentInstrument)) return;
    Transaction.wrap(function () {
        basket.removePaymentInstrument(paymentInstrument[0]);
    });
}

/**
 * CreatePaymentInstrument
 *
 * @param {Object} basket - Basket
 * @param {string} paymentType - Name of the payment method.
 * @returns {Object} Payment instrument
 */
function createPaymentInstrument(basket, paymentType) {
    var paymentInstr = null;
    var amount = calculateNonGiftCertificateAmount(basket);

    Transaction.wrap(function () {
        paymentInstr = basket.createPaymentInstrument(paymentType, amount);
    });

    return paymentInstr;
}

/**
 * Removes payment instruments from Basket except GIFT_CERTIFICATE
 *
 * @param {Object} basket - Basket
 */
function removeNonMoneiPaymentInstrument(basket) {
    var paymentInstruments = basket.getPaymentInstruments();

    var iterator = paymentInstruments.iterator();
    var paymentInstrument = null;
    Transaction.wrap(function () {
        while (iterator.hasNext()) {
            paymentInstrument = iterator.next();
            if (paymentInstrument.paymentMethod === 'GIFT_CERTIFICATE') {
                /* eslint-disable no-continue */
                continue;
            }
            basket.removePaymentInstrument(paymentInstrument);
        }
    });
}

module.exports = {
    calculateNonGiftCertificateAmount: calculateNonGiftCertificateAmount,
    createPaymentInstrument: createPaymentInstrument,
    removeMoneiPaymentInstrument: removeMoneiPaymentInstrument,
    getMoneiPaymentInstrument: getMoneiPaymentInstrument,
    removeNonMoneiPaymentInstrument: removeNonMoneiPaymentInstrument
};
