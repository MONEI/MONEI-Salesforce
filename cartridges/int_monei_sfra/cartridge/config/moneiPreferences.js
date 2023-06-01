'use strict';

const allowedProcessorsIds = 'MONEI';

/**
 * Returns monei payment method ID
 * @returns {string} active monei payment method id
 */
function getMoneiPaymentMethodId() {
    const activePaymentMethods = require('dw/order/PaymentMgr').getActivePaymentMethods();
    var moneiPaymentMethodID;

    Array.some(activePaymentMethods, function (paymentMethod) {
        if (paymentMethod.paymentProcessor.ID === allowedProcessorsIds) {
            moneiPaymentMethodID = paymentMethod.ID;
            return true;
        }
        return false;
    });
    return moneiPaymentMethodID;
}

/**
 *  Returns monei custom and hardcoded preferences
 *
 * @returns {Object} statis preferences
 */
function getPreferences() {
    const prefsCache = require('dw/system/CacheMgr').getCache('moneiPreferences');
    var prefs = prefsCache.get('preferences');
    if (prefs) {
        return prefs;
    }

    const site = require('dw/system/Site').current;
    var paymentMethods = site.getCustomPreferenceValue('MONEI_API_Payment_Methods');
    var paymentMethodsString = [];
    if (paymentMethods) {
        for (var i = 0; i < paymentMethods.length; i++) {
            paymentMethodsString[i] = paymentMethods[i].getValue();
        }
    }

    prefs = {
        moneiPaymentMethodId: getMoneiPaymentMethodId(),
        allowedPaymentMethods: paymentMethodsString,
        transactionType: 'AUTH',
        paymentPageType: site.getCustomPreferenceValue('MONEI_API_Type_Page').getValue(),
        description: site.getCustomPreferenceValue('MONEI_API_Message'),
        urlApiMonei: site.getCustomPreferenceValue('MONEI_API_URL').toString()
    };
    prefsCache.put('preferences', prefs);

    return prefs;
}

module.exports = getPreferences();
