'use strict';

const Transaction = require('dw/system/Transaction');
const PaymentMgr = require('dw/order/PaymentMgr');
const Order = require('dw/order/Order');

const {
    createPaymentInstrument
} = require('./helpers/paymentInstrumentHelper');


const {
      getMoneiNewTransaction,
      deleteMoneiNewTransaction
} = require('../monei/moneiUtils');

const {
    authorizePayment,
    cancelPayment
} = require('../monei/moneiAPI');

const {
    getPaymentInfo,
    isPurchaseUnitChanged
} = require('../monei/helpers/moneiHelper');



/**
 * Processor Handle
 *
 * @param {dw.order.LineItemCtnr} basket - Current basket
 * @param {Object} paymentInformation - paymentForm from hook
 * @returns {Object} Processor handling result
 */
function handle(basket, paymentInformation) {
    var paymentInstrument = createPaymentInstrument(basket, paymentInformation.billingForm.paymentMethod.value);
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInformation.billingForm.paymentMethod.value).getPaymentProcessor();
    var orderIdDetails;

    
    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
            var moneiOrders = getMoneiNewTransaction(paymentInformation.billingForm.monei.orderID.value, paymentInformation.billingForm.monei.moneiPaymentID.value);
            if (moneiOrders && moneiOrders.hasNext()){
                paymentInstrument.custom.moneiPaymentID = paymentInformation.billingForm.monei.moneiPaymentID.value;
            }else{
                return { error: true };
            }
            
            orderIdDetails = {
                orderId: paymentInformation.billingForm.monei.orderID.value,
                moneiPaymentID: paymentInformation.billingForm.monei.moneiPaymentID.value
            };
        
    });

    return {
        success: true,
        paymentInstrument: paymentInstrument,
        orderIdDetails: orderIdDetails
    };
}

/**
 * Save result of rest call and update order data
 *
 * @param {dw.order.LineItemCtnr} order - Order object
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument - current payment instrument
 * @returns {Object} Processor authorizing result
 */
function authorize(order, paymentInstrument) {
    const purchaseUnit = getPaymentInfo(order, session.privacy.paymentEmail, session.privacy.paymentPhone);
    const isUpdateRequired = isPurchaseUnitChanged(purchaseUnit);
    delete session.privacy.moneiUsedOrderNo;
   

    if (empty(paymentInstrument) || empty(order) || order.status === Order.ORDER_STATUS_FAILED) {
        return { error: true };
    }

    if (paymentInstrument.paymentTransaction.amount.value === 0) {
        return { error: true };
    }

    if (paymentInstrument.custom.moneiPaymentID && isUpdateRequired) {
        let { err } = cancelPayment(paymentInstrument.custom.moneiPaymentID);
        delete session.privacy.orderDataHash;
        deleteMoneiNewTransaction(purchaseUnit.orderId, paymentInstrument.custom.moneiPaymentID);
            return {
                authorized: false,
                error: true,
                message: err
            };
        
    }

   

    var response  = authorizePayment(paymentInstrument.custom.moneiPaymentID, purchaseUnit.amount);
    if (response.err) {
        return { error: true };
    }else{

        Transaction.wrap(function () {
            paymentInstrument.getPaymentTransaction().setTransactionID(response.authorizationCode);
            paymentInstrument.custom.moneiPaymentStatus = response.status;
            order.custom.moneiPaymentMethod = 'MONEI';
            order.custom.Monei_API_PaymentID = paymentInstrument.custom.moneiPaymentID;
        });

        delete session.privacy.orderDataHash;
        deleteMoneiNewTransaction(purchaseUnit.orderId, paymentInstrument.custom.moneiPaymentID);
        return { authorized: true };
    }
}


module.exports = {
    handle: handle,
    authorize: authorize
}
