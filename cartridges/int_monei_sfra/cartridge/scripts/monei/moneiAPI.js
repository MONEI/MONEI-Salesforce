'use strict';

const Transaction = require('dw/system/Transaction');
const Money = require('dw/value/Money');
const moneiRestService = require('../service/moneiRestService');
const {
    createErrorLog,
    createErrorMsg
} = require('./moneiUtils');

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
        createErrorLog('No payer info was found. Order ID ' + payment.custom.moneiPaymentID);
        throw new Error();
    } catch (err) {
        return { err: createErrorMsg(err.message) };
    }
}

function authorizePayment(paymentId, amountInteger) {
     try {
         var url = 'payments/'+paymentId+'/capture';
         var resp = moneiRestService.call({
             path: url,
             method: 'POST',
             body: {"amount":amountInteger}
         });
 
         if (resp) {
             return resp;
         }
         createErrorLog('No payer info was found. Order ID ' + payment.custom.moneiPaymentID);
        throw new Error();
     } catch (err) {
         return { err: createErrorMsg(err.message) };
     }
 }

 function cancelPayment(paymentId) {
   
    try {
        var url = 'payments/'+paymentId+'/cancel';
        var resp = moneiRestService.call({
            path: url,
            method: 'POST',
            body: {
                "cancellationReason": "requested_by_customer"
                }
        });

        if (resp) {
            return resp;
        }
        createErrorLog('No payer info was found. Order ID ' + payment.custom.moneiPaymentID);
       throw new Error();
    } catch (err) {
        return { err: createErrorMsg(err.message) };
    }
}

 module.exports = {
    createPayment: createPayment,
    authorizePayment: authorizePayment,
    cancelPayment: cancelPayment
};