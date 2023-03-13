
'use strict';

const Encoding = require('dw/crypto/Encoding');
const Bytes = require('dw/util/Bytes');
const URLUtils = require('dw/web/URLUtils');
const Resource = require('dw/web/Resource');

let paypalLogger;


/**
 * Encodes purchase unit object into encoded string
 *
 * @param {Object} purchaseUnit purchase unit
 * @returns {string} encoded string
 */
function encodeString(purchaseUnit) {
    const bytes = new Bytes(JSON.stringify(purchaseUnit));
    return Encoding.toBase64(bytes);
}


/**
 * Get logger instance
 *
 * @param {string} err Error message
 */
function createErrorLog(err) {
    var Logger = require('dw/system/Logger');
    paypalLogger = paypalLogger || Logger.getLogger('Monei', 'Monei_General');
    if (!empty(err)) {
        paypalLogger.error(err.stack ? (err.message + err.stack) : err);
    } else {
        paypalLogger.debug('Empty log entry');
    }
    return;
}

/**
 * Create URL for a call
 * @param  {string} host
 * @param  {string} path REST action endpoint
 * @returns {string} url for a call
 */
function getUrlPath(host, path) {
    var url = host;
    if (!url.match(/.+\/$/)) {
        if (!path.match(/^\//)){
            url += '/';
        }
    }else{
        if (path.match(/^\//)){
            return url += path.substring(1);
        }
    }
    url += path;
    return url;
}

function getUrls() {
    return {
        paymentStage: URLUtils.https('Checkout-Begin', 'stage', 'payment').toString(),
        placeOrderStage: URLUtils.https('Checkout-Begin', 'stage', 'placeOrder').toString(),
        getPayment: URLUtils.https('Monei-Payments').toString(),
        callbackUrl: URLUtils.https('Monei-Callback').toString(),
        completeUrl: URLUtils.https('Checkout-Begin', 'stage', 'payment').toString()
        };
}

function getMoneiNewTransaction(orderId,moneiPaymentId){ 
    return dw.object.CustomObjectMgr.queryCustomObjects('MoneiNewTransactions', 'custom.orderNo = {0} and custom.moneiPaymentId = {1}',null, orderId, moneiPaymentId);
}

function deleteMoneiNewTransaction(orderId,moneiPaymentId){ 
    const { queryCustomObjects, remove } = require('dw/object/CustomObjectMgr');
    const transactionToRemove = queryCustomObjects('MoneiNewTransactions', 'custom.orderNo = {0} and custom.moneiPaymentId = {1}', null, orderId, moneiPaymentId);
    while (transactionToRemove.hasNext()) {
        remove(transactionToRemove.next());
    }
}


/**
 * Creates the Error Message
 *
 * @param {string} errorName error message name
 * @returns {string} errorMsg - Resource error massage
 */
function createErrorMsg(errorName) {
    const defaultMessage = Resource.msg('monei.error.general', 'moneierrors', null);
    const errorMsg = Resource.msg('monei.error.' + errorName, 'moneierrors', defaultMessage);
    return errorMsg;
}

module.exports = {
    createErrorLog: createErrorLog,
    encodeString: encodeString,
   createErrorMsg: createErrorMsg,
   getUrlPath:getUrlPath,
   getUrls:getUrls,
   getMoneiNewTransaction:getMoneiNewTransaction,
   deleteMoneiNewTransaction: deleteMoneiNewTransaction

};
