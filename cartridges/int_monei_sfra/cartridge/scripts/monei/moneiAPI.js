'use strict';

var moneiRestService = require('*/cartridge/scripts/service/moneiRestService');
var moneiHelper = require('*/cartridge/scripts/helpers/moneiHelper');

/**
 * Function to get information about an order
 *
 * @param {Object} payment - moneyPayment
 * @returns {Object} Call handling result
 */
function createPayment(payment) {
    try {
        var resp = moneiRestService.call({
            path: 'payments',
            method: 'POST',
            body: payment
        });

        if (resp) {
            return resp;
        }
        moneiHelper.createErrorLog('No payer info was found. Order ID ' + payment.custom.moneiPaymentID);
        throw new Error();
    } catch (err) {
        return { err: moneiHelper.createErrorMsg(err.message) };
    }
}

module.exports = {
    createPayment: createPayment
};
