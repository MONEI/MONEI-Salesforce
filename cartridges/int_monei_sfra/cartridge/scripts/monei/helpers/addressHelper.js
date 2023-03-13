'use strict';

const Transaction = require('dw/system/Transaction');

var addressHelper = {};

/**
* Returns Object with first, second, last names from a simple string person name
*
* @param {string} name Person Name
* @returns {Object} person name Object
*/
addressHelper.createPersonNameObject = function (name) {
    var nameNoLongSpaces = name.trim().replace(/\s+/g, ' ').split(' ');
    if (nameNoLongSpaces.length === 1) {
        return {
            firstName: name,
            secondName: null,
            lastName: null
        };
    }
    var firstName = nameNoLongSpaces.shift();
    var lastName = nameNoLongSpaces.pop();
    var secondName = nameNoLongSpaces.join(' ');
    return {
        firstName: firstName,
        secondName: secondName.length ? secondName : null,
        lastName: lastName
    };
};


/**
* Update Billing Address for order with order id
* @param  {dw.order.Basket} basket - Current users's basket
* @param  {Object} billingAddress user's billing address
*/
addressHelper.updateOrderBillingAddress = function (basket, billingAddress) {
    const { name, address, phone, email_address } = billingAddress;

    Transaction.wrap(function () {
        var billing = basket.getBillingAddress() || basket.createBillingAddress();
        billing.setFirstName(name.given_name || '');
        billing.setLastName(name.surname || '');
        billing.setCountryCode(address.country_code);
        billing.setCity(address.admin_area_2 || '');
        billing.setAddress1(address.address_line_1 || '');
        billing.setAddress2(address.address_line_2 || '');
        billing.setPostalCode(address.postal_code || '');
        billing.setStateCode(address.admin_area_1 || '');
        if (empty(billing.phone)) {
            billing.setPhone(phone.phone_number.national_number || '');
        }
        if (empty(basket.customerEmail)) {
            basket.setCustomerEmail(email_address);
        }
    });
};

/**
* Update Shipping Address for order with order id
* @param  {dw.order.Basket} basket basket - Current users's basket
* @param  {Object} shippingInfo - user's shipping address
* @param  {Object} billingAddress user's billing address
*/
addressHelper.updateOrderShippingAddress = function (basket, shippingInfo, billingAddress) {
    var shipping;
    var fullShippingName = shippingInfo[0].shipping.name.full_name;
    var fullName = addressHelper.createPersonNameObject(fullShippingName);
    var shippingAddress = shippingInfo[0].shipping.address;

    Transaction.wrap(function () {
        shipping = basket.getDefaultShipment().getShippingAddress() || basket.getDefaultShipment().createShippingAddress();
        shipping.setCountryCode(shippingAddress.country_code);
        shipping.setCity(shippingAddress.admin_area_2 || '');
        shipping.setAddress1(shippingAddress.address_line_1 || '');
        shipping.setAddress2(shippingAddress.address_line_2 || '');
        shipping.setPostalCode(shippingAddress.postal_code || '');
        shipping.setStateCode(shippingAddress.admin_area_1 || '');
        shipping.setPhone(billingAddress.phone.phone_number.national_number || '');

        if (!empty(fullName.firstName)) {
            shipping.setFirstName(fullName.firstName || '');
        }
        if (!empty(fullName.secondName)) {
            shipping.setSecondName(fullName.secondName || '');
        }
        if (!empty(fullName.lastName)) {
            shipping.setLastName(fullName.lastName || '');
        }
    });
};

/**
 * Creates shipping address
 * @param {Object} shippingAddress - user's shipping address
 * @returns {Object} with created shipping address
 */
addressHelper.createShippingAddress = function (shippingAddress) {
    return {
        name: {
            full_name: shippingAddress.fullName
        },
        address: {
            address_line_1: shippingAddress.address1,
            address_line_2: shippingAddress.address1,
            admin_area_1: shippingAddress.stateCode,
            admin_area_2: shippingAddress.city,
            postal_code: shippingAddress.postalCode,
            country_code: shippingAddress.countryCode.value.toUpperCase()
        }
    };
};



module.exports = addressHelper;
