/* global session */

'use strict';

var UUIDUtils = require('dw/util/UUIDUtils');
var site = require('dw/system/Site').current;
const moneiStatus = {
    FAILED: 'FAILED',
    CANCELLED: 'CANCELED',
    PENDING: 'PENDING',
    SUCCEEDED: 'SUCCEEDED',
    AUTHORIZED: 'AUTHORIZED',
    REFUNDED: 'REFUNDED',
    PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
    EXPIRED: 'EXPIRED'
};

/**
 * Generate session ID
 * session.sessionID do not pass Monei validation rules
 *
 * @returns {string} unique ID used for identifying the session
 */
function generateSessionUniqueID() {
    var sessionUniqueID;

    if (Object.hasOwnProperty.call(session.privacy, 'moneiUniqueID')) {
        sessionUniqueID = session.privacy.moneiUniqueID;
    } else {
        sessionUniqueID = UUIDUtils.createUUID();
        session.privacy.moneiUniqueID = sessionUniqueID;
    }
    return sessionUniqueID;
}

/**
 * Returns Monei account ID from site preferences
 *
 * @returns {string} the account ID
 */
function getAccountId() {
    return site.getCustomPreferenceValue('MONEI_API_Account_ID');
}

/**
 * Returns Monei api key from site preferences
 *
 * @returns {string} the Api Key
 */
function getApiKey() {
    return site.getCustomPreferenceValue('MONEI_API_Key');
}

/**
 * Returns monei custom and hardcoded preferences
 *
 * @returns {Object} monei preferences
 */
function getPreferences() {
    return {
        accountId: getAccountId(),
        sessionId: generateSessionUniqueID(),
        paymentPageType: site.getCustomPreferenceValue('MONEI_API_Type_Page').getValue(),
        urlMoneiClientPlugin: site.getCustomPreferenceValue('MONEI_Plugin_Url').toString()
    };
}

module.exports = {
    getPreferences: getPreferences,
    getAccountId: getAccountId,
    getApiKey: getApiKey,
    status: moneiStatus
};
