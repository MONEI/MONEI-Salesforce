'use strict';

var Resource = require('dw/web/Resource');
var OrderMgr = require('dw/order/OrderMgr');
var Order = require('dw/order/Order');
var URLUtils = require('dw/web/URLUtils');
var Locale = require('dw/util/Locale');
var moneiPreferences = require('*/cartridge/config/moneiPreferences');

const supportedLang = ['en', 'es', 'ca', 'pt', 'de', 'it', 'fr', 'nl', 'et', 'fi', 'lv', 'no', 'pl', 'ru'];
const serviceName = 'int_monei.http.rest';

function getPreferences() {
    return moneiPreferences.getPreferences();
}

function getOrderData(order) {
    var orderData = {};

    if (order) {
        orderData.amount = order.moneiOrderData.amount;
        orderData.currency = order.moneiOrderData.currencyCode;
    }

    return orderData;
}

function getServiceName() {
    return serviceName;
}

function getCurrentLanguage(locale) {
    var language = 'en';

    if (!empty(locale) && Object.hasOwnProperty.call(locale, 'id')) {
        var currentLocale = Locale.getLocale(locale.id);
        if (Object.hasOwnProperty.call(currentLocale, 'language')) {
            if (supportedLang.indexOf(currentLocale.language) > -1) {
                language = currentLocale.language;
            }
        }
    }

    return language;
}

function toHexString(byteArray) {
    var s = '';

    for (var i = 0; i < byteArray.getLength(); i++) {
        s += ('0' + (byteArray.byteAt(i) & 0xFF).toString(16)).slice(-2);
    }

    return s;
}

/**
 * Create URL for a call
 * @param  {string} host the host
 * @param  {string} path REST action endpoint
 * @returns {string} url for a call
 */
function getUrlPath(host, path) {
    var url = host;
    if (!url.match(/.+\/$/)) {
        if (!path.match(/^\//)) {
            url += '/';
        }
    } else if (path.match(/^\//)) {
        url += path.substring(1);
        return url;
    }

    url += path;
    return url;
}

/**
 * Get logger instance
 *
 * @param {string} err Error message
 */
function createErrorLog(err) {
    var Logger = require('dw/system/Logger');
    var logger = Logger.getLogger('Monei', 'Monei_General');

    if (!empty(err)) {
        logger.error(err);
    }
    return;
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

/**
 * Creates the payment payload
 *
 * @param {dw.order.Basket} currentBasket - the current basket
 * @param {Object} paymentInformation - monei current details retrieved by form_processor hook
 * @returns {Object} payload - the payload to be sent to Monei API
 */
function createPaymentPayload(currentBasket, paymentInformation) {
    var payload = {};
    var orderNo = currentBasket instanceof Order ? currentBasket.orderNo : OrderMgr.createOrderNo();

    payload.accountId = moneiPreferences.getAccountId();
    payload.sessionId = paymentInformation.moneiSessionID.value;
    payload.amount = paymentInformation.moneiAmont.value;
    payload.currency = paymentInformation.moneiCurrency.value;
    payload.orderId = orderNo;
    payload.description = Resource.msg('global.storename', 'common', null) + ' - ' + orderNo;
    payload.callbackUrl = URLUtils.https('Monei-Callback').toString();
    payload.billingDetails = {
        name: currentBasket.billingAddress.fullName,
        email: currentBasket.customerEmail,
        phone: currentBasket.billingAddress.phone,
        address: {
            country: currentBasket.billingAddress.countryCode.getValue(),
            city: currentBasket.billingAddress.city,
            line1: currentBasket.billingAddress.address1,
            zip: currentBasket.billingAddress.postalCode,
            state: currentBasket.billingAddress.stateCode
        }
    };
    payload.shippingDetails = {
        name: currentBasket.defaultShipment.shippingAddress.fullName,
        email: currentBasket.customerEmail,
        phone: currentBasket.defaultShipment.shippingAddress.phone,
        address: {
            country: currentBasket.defaultShipment.shippingAddress.countryCode.getValue(),
            city: currentBasket.defaultShipment.shippingAddress.city,
            line1: currentBasket.defaultShipment.shippingAddress.address1,
            zip: currentBasket.defaultShipment.shippingAddress.postalCode,
            state: currentBasket.defaultShipment.shippingAddress.stateCode
        }
    };
    payload.customer = {
        email: currentBasket.customerEmail,
        name: currentBasket.billingAddress.fullName,
        phone: currentBasket.billingAddress.phone
    };

    return payload;
}

function verifySignature(body, signature) {
    var Mac = require('dw/crypto/Mac');
    var result = {
        error: false
    };

    var signatureSplitted = signature.split(',');
    var params = {};

    for (var n = 0; n < signatureSplitted.length; n++) {
        var part = signatureSplitted[n];
        var [key, value] = part.split('=');
        params[key] = value;
    }

    var hmac = Mac(Mac.HMAC_SHA_256);
    result = hmac.digest(params.t + '.' + body, moneiPreferences.getApiKey());

    if (toHexString(result) !== params.v1) {
        createErrorLog(Resource.msg('monei.error.signature', 'moneierrors', null));
        result.error = true;
    }

    return JSON.parse(body);
}

module.exports = {
    createErrorLog: createErrorLog,
    createErrorMsg: createErrorMsg,
    getUrlPath: getUrlPath,
    createPaymentPayload: createPaymentPayload,
    verifySignature: verifySignature,
    getPreferences: getPreferences,
    getOrderData: getOrderData,
    getCurrentLanguage: getCurrentLanguage,
    getServiceName: getServiceName,
    toHexString: toHexString
};
