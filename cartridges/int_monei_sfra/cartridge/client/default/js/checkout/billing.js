'use strict';

var base = require('base/checkout/billing');

/**
 * Updates the payment information in checkout, based on the supplied order model
 * @param {Object} order - checkout model to use as basis of new truth
 */
function updatePaymentInformation(order) {
    // update payment details
    var $paymentSummary = $('.payment-details');
    var htmlToAppend = '';

    if (order.billing.payment && order.billing.payment.selectedPaymentInstruments
        && order.billing.payment.selectedPaymentInstruments.length > 0) {
        if (order.billing.payment.selectedPaymentInstruments[0].paymentMethod === 'CREDIT_CARD') {
            htmlToAppend += '<span>' + order.resources.cardType + ' '
                + order.billing.payment.selectedPaymentInstruments[0].type
                + '</span>';

            if (order.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber) {
                htmlToAppend += '<div>'
                    + order.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber
                    + '</div>';
            }
            if (order.billing.payment.selectedPaymentInstruments[0].expirationMonth && order.billing.payment.selectedPaymentInstruments[0].expirationYear) {
                htmlToAppend += '<div><span>'
                + order.resources.cardEnding + ' '
                + order.billing.payment.selectedPaymentInstruments[0].expirationMonth
                + '/' + order.billing.payment.selectedPaymentInstruments[0].expirationYear
                + '</span></div>';
            }
        } else if (order.billing.payment.selectedPaymentInstruments[0].paymentMethod.toLowerCase().indexOf('monei') > -1) {
            htmlToAppend += '<div><span>'
                + order.billing.payment.selectedPaymentInstruments[0].paymentMethodName
                + '</span></div>';

            if (typeof order.billing.payment.selectedPaymentInstruments[0].amount !== 'undefined') {
                htmlToAppend += '<div><span>'
                    + order.billing.payment.selectedPaymentInstruments[0].formattedAmount
                    + '</span></div>';
            }
        }
    }

    $paymentSummary.empty().append(htmlToAppend);
}

base.methods.updatePaymentInformation = updatePaymentInformation;
module.exports = base;
