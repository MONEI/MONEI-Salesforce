'use strict';

const OrderMgr = require('dw/order/OrderMgr');
const Transaction = require('dw/system/Transaction');
const Order = require('dw/order/Order');
const Money = require('dw/value/Money');
const StringUtils = require('dw/util/StringUtils');
const Mac = require('dw/crypto/Mac');
const serviceName = 'int_monei.http.rest';
const ServiceRegistry = require('dw/svc/LocalServiceRegistry');
const URLUtils = require('dw/web/URLUtils');


const { encodeString, createErrorMsg, getUrls } = require('../moneiUtils');
const {
    moneiPaymentMethodId,
    completeUrl,
    cancelUrl,
    failUrl, 
    allowedPaymentMethods,
    transactionType, 
    description
} = require('../../../config/moneiPreferences');
const { calculateNonGiftCertificateAmount } = require('./paymentInstrumentHelper');
const {
    createShippingAddress
} = require('./addressHelper');

/**
 * Create purchase unit description based on items in the basket
 * @param  {dw.order.ProductLineItem} productLineItems Items in the basket
 * @returns {string} item description
 */
function getItemsDescription(productLineItems) {
    return Array.map(productLineItems, function (productLineItem) {
        return productLineItem.productName;
    }).join(',').substring(0, 127);
}

/**
 * @param  {dw.value.Money} acc current basket order + product discount
 * @param  {dw.order.OrderPaymentInstrument} giftCertificate GC from the basket
 * @returns {dw.value.Money} Gift certificate cotal
 */
function getAppliedGiftCertificateTotal(acc, giftCertificate) {
    return acc.add(giftCertificate.paymentTransaction.amount);
}

/**
 * Creates puchase unit data
 * @param {dw.order.Basket} currentBasket - user's basket
 * @param {boolean} isCartFlow - whether from cart or no
 * @returns {Object} with purchase unit data
 */
function getPurchaseUnit(currentBasket, isCartFlow) {
    const {
        currencyCode,
        defaultShipment,
        productLineItems,
        totalTax,
        shippingTotalPrice,
        adjustedShippingTotalPrice,
        merchandizeTotalPrice,
        adjustedMerchandizeTotalPrice,
        giftCertificateTotalPrice
    } = currentBasket;
    let orderNo;
    let handling;
    let insurance;

    Transaction.wrap(function () {
        orderNo = currentBasket instanceof Order ?
            currentBasket.orderNo :
            OrderMgr.createOrderNo();
    });
    const nonShippingDiscount = Array.reduce(
        currentBasket.giftCertificatePaymentInstruments,
        getAppliedGiftCertificateTotal,
        merchandizeTotalPrice.subtract(adjustedMerchandizeTotalPrice)
    );

    const purchaseUnit = {
        description: getItemsDescription(productLineItems),
        amount: {
            currency_code: currencyCode,
            value: calculateNonGiftCertificateAmount(currentBasket).value.toString(),
            breakdown: {
                item_total: {
                    currency_code: currencyCode,
                    value: merchandizeTotalPrice.add(giftCertificateTotalPrice).value.toString()
                },
                shipping: {
                    currency_code: currencyCode,
                    value: shippingTotalPrice.value.toString()
                },
                tax_total: {
                    currency_code: currencyCode,
                    value: totalTax.value.toString()
                },
                handling: {
                    currency_code: currencyCode,
                    value: !empty(handling) ? handling : '0'
                },
                insurance: {
                    currency_code: currencyCode,
                    value: !empty(insurance) ? insurance : '0'
                },
                shipping_discount: {
                    currency_code: currencyCode,
                    value: shippingTotalPrice
                        .subtract(adjustedShippingTotalPrice)
                        .value.toString()
                },
                discount: {
                    currency_code: currencyCode,
                    value: nonShippingDiscount.value.toString()
                }
            }
        },
        invoice_id: orderNo
    };
    if (!isCartFlow && defaultShipment && defaultShipment.getShippingAddress()) {
        purchaseUnit.shipping = createShippingAddress(defaultShipment.getShippingAddress());
    }
    return purchaseUnit;
}




//TODO QUIZAS QUITAR EL ORDERNO Y USAR EL DE ARRIBA
/**
 * Creates payment
 * @param {dw.order.Basket} currentBasket - user's basket
 * @returns {Object} with payment data
 */
function getPaymentInfo(currentBasket, email, phone) {
    let orderNo;
    

    Transaction.wrap(function () {
        orderNo = currentBasket instanceof Order ?
            currentBasket.orderNo :
            OrderMgr.createOrderNo();
    });

   const paymentInfo = {
        amount:Math.round(calculateNonGiftCertificateAmount(currentBasket).value *100),
        currency: currentBasket.currencyCode,
        orderId:orderNo,
        description: description,
        allowedPaymentMethods: allowedPaymentMethods,
        transactionType: transactionType, 
        completeUrl: getUrls().completeUrl,
        callbackUrl: getUrls().callbackUrl, 
        billingDetails: {
            name: currentBasket.billingAddress.fullName,
            email: email,
            phone: phone,
            address: {
              country: currentBasket.billingAddress.countryCode.getValue(),
              city: currentBasket.billingAddress.city,
              line1: currentBasket.billingAddress.address1,
               zip: currentBasket.billingAddress.postalCode,
              state: currentBasket.billingAddress.stateCode
            }
          },
          shippingDetails: {
            name: currentBasket.defaultShipment.shippingAddress.fullName,
            email: email,
            phone: phone,
            address: {
              country: currentBasket.defaultShipment.shippingAddress.countryCode.getValue(),
              city: currentBasket.defaultShipment.shippingAddress.city,
              line1: currentBasket.defaultShipment.shippingAddress.address1,
              zip: currentBasket.defaultShipment.shippingAddress.postalCode,
              state: currentBasket.defaultShipment.shippingAddress.stateCode
            }
        },
    }
    if (currentBasket.customer.authenticated){
        paymentInfo.customer = {
            email:currentBasket.customer.profile.email,
            name:currentBasket.customer.profile.firstName+' '+customer.profile.lastName,
            phone:phone
        }
        }else{
            paymentInfo.customer = {
                email:email,
                name:currentBasket.defaultShipment.shippingAddress.fullName,
                phone:phone
            }
    }
    if(currentBasket.billingAddress.companyName){
        paymentInfo.billingDetails.company = currentBasket.billingAddress.companyName;
    }
    if(currentBasket.defaultShipment.shippingAddress.companyName){
        paymentInfo.shippingDetails.company = currentBasket.defaultShipment.shippingAddress.companyName;
    }
    if(currentBasket.billingAddress.address2){
        paymentInfo.billingDetails.line2 = currentBasket.billingAddress.address2;
    }
    if(currentBasket.defaultShipment.shippingAddress.address2){
        paymentInfo.shippingDetails.line2 = currentBasket.defaultShipment.shippingAddress.address2;
    }
    return paymentInfo;
}

function toHexString(byteArray) {
  var s = '';
  for(var i = 0; i < byteArray.getLength(); i++){
    s += ('0' + (byteArray.byteAt(i) & 0xFF).toString(16)).slice(-2);
  }
  return s;
  }


function verifySignature(body,signature) {
    var restService = ServiceRegistry.createService(serviceName,{});
    var signatureSplited = signature.split(',');
    var params = {};
    for(var n = 0; n < signatureSplited.length; n++){
        var part = signatureSplited[n];
        var [key, value] = part.split('=');
        params[key] = value;
    }
    var hmac = Mac(Mac.HMAC_SHA_256);
    var result = hmac.digest(params['t']+'.'+body,restService.configuration.credential.password);

    if (toHexString(result)!== params.v1) {
      throw new Error(createErrorMsg('signature'));
    }

    return JSON.parse(body);
}


/**
 * Returns transaction end time, result
 * (min) transaction lifetime (by default 72h or 4320min)
 * @param {dw.order.PaymentInstrument} paymentInstrument - Monei payment instrument from basket
 * @returns {boolean} expired status
 */
function isExpiredTransaction(paymentInstrument) {
    if (!paymentInstrument) return false;
    //Una semana menos una hora
    var min = 10020;
    return Date.now() >= new Date(Date.parse(paymentInstrument.creationDate) + min * 60000).getTime();
}

/**
 * Returns true if email is not empty and have error from core
 * @param {Object} billingData - billingData from checkout
 * @returns {boolean}  true or false
 */
function isErrorEmail(billingData) {
    if (empty(billingData)) return false;

    if (billingData.form &&
        billingData.form.contactInfoFields.email &&
        !empty(billingData.form.contactInfoFields.email.htmlValue) &&
        !empty(billingData.fieldErrors) &&
        billingData.fieldErrors[0].dwfrm_billing_contactInfoFields_email
    ) {
        return true;
    }
    return false;
}

/**
 * Returns error response object for json
 * @param {Object} billingData - billingData from checkout
 * @returns {Object}  response
 */
function createErrorEmailResponse(billingData) {
    if (empty(billingData)) return false;

    return {
        form: billingData.form,
        fieldErrors: [{ dwfrm_billing_contactInfoFields_email: billingData.fieldErrors[0].dwfrm_billing_contactInfoFields_email }],
        error: true
    };
}

/**
 * Returns whether purchase unit has changed
 * @param {Object} purchaseUnit - purchase unit
 * @returns {boolean}  true or false
 */
function isPurchaseUnitChanged(purchaseUnit) {
    if (!session.privacy.orderDataHash) return true;
    return session.privacy.orderDataHash !== encodeString(purchaseUnit);
}

/**
* The hack renders right mock data for updatePaymentInformation(order)
* @param {Object} basketModel - order data
* @param {string} currencyCode - currencyCode
*/
function basketModelHack(basketModel, currencyCode) {
    const { resources, billing } = basketModel;
    resources.cardType = '';
    resources.cardEnding = '';
    let moneiAmount = billing.payment.selectedPaymentInstruments[0].amount;
    billing.payment.selectedPaymentInstruments.forEach(function (pi) {
        if (pi.paymentMethod === moneiPaymentMethodId) {
            pi.type = '';
            pi.maskedCreditCardNumber = basketModel.moneiPayerEmail || '';
            pi.expirationMonth = 'Monei ';
            pi.expirationYear = ' ' + StringUtils.formatMoney(new Money(moneiAmount, currencyCode));
        }
    });
}

/**
 * Creates payment form for cart checkout
 * @param  {Object} data - monei data from req
 * @returns {Object} object with payment form
 */
function cartPaymentForm(data) {
    return {
        billingForm: {
            paymentMethod: {
                value: moneiPaymentMethodId
            },
            monei: {
                moneiPaymentID: {
                    value: data.moneiData && data.moneiData.moneiPaymentID
                }
            }
        }
    };
}


/**
 * Sets customer's email to basket if user filled up or changed email on storefront
 *
 * @param {Object} basket - current user's basket
 * @param {Object} billingData - billing data from billing form
 */
function updateCustomerEmail(basket, billingData) {
    if (billingData.email && (!basket.customerEmail && billingData.email.value ||
        basket.customerEmail !== billingData.email.value)) {
        Transaction.wrap(function () {
            basket.setCustomerEmail(billingData.email.value);
        });
    } else if (billingData.form &&
        billingData.form.contactInfoFields.email &&
        !empty(billingData.form.contactInfoFields.email.htmlValue) &&
        (!basket.customerEmail && billingData.form.contactInfoFields.email.htmlValue ||
            basket.customerEmail !== billingData.form.contactInfoFields.email.htmlValue)) {
        Transaction.wrap(function () {
            basket.setCustomerEmail(billingData.form.contactInfoFields.email.htmlValue);
        });
    }
}

/**
 * Sets customer's phone to basket if user filled up or changed email on storefront
 *
 * @param {Object} basket - current user's basket
 * @param {Object} billingData - billing data from billing form
 */
function updateCustomerPhone(basket, billingData) {
    var billing = basket.getBillingAddress();
    if (billingData.phone && !empty(billingData.phone.value) &&
        basket.billingAddress.phone !== billingData.phone.value) {
        Transaction.wrap(function () {
            billing.setPhone(billingData.phone.value);
        });
    } else if (billingData.form && billingData.form.contactInfoFields.phone &&
        (!empty(billingData.form.contactInfoFields.phone.htmlValue) &&
            basket.billingAddress.phone !== billingData.form.contactInfoFields.phone.htmlValue)) {
        Transaction.wrap(function () {
            billing.setPhone(billingData.form.contactInfoFields.phone.htmlValue);
        });
    }
}



module.exports = {
    isExpiredTransaction: isExpiredTransaction,
    isErrorEmail: isErrorEmail,
    createErrorEmailResponse: createErrorEmailResponse,
    isPurchaseUnitChanged: isPurchaseUnitChanged,
    getPurchaseUnit: getPurchaseUnit,
    getPaymentInfo: getPaymentInfo,
    verifySignature: verifySignature,
    basketModelHack: basketModelHack,
    cartPaymentForm: cartPaymentForm,
    updateCustomerEmail: updateCustomerEmail,
    updateCustomerPhone: updateCustomerPhone
};
