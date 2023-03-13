'use strict';

var server = require('server');
const Transaction = require('dw/system/Transaction');
const HookMgr = require('dw/system/HookMgr');
const Resource = require('dw/web/Resource');
const PaymentMgr = require('dw/order/PaymentMgr');

const {
    isPurchaseUnitChanged,
    getPurchaseUnit,
    getPaymentInfo,
    isExpiredTransaction,
    verifySignature
} = require('../scripts/monei/helpers/moneiHelper');

const {
    createPayment
} = require('../scripts/monei/moneiAPI');

const {
    encodeString,
    createErrorMsg,
    createErrorLog
} = require('../scripts/monei/moneiUtils');

const {
    createPaymentInstrument,
    getMoneiPaymentInstrument,
    removeMoneiPaymentInstrument,
    removeNonMoneiPaymentInstrument
} = require('../scripts/monei/helpers/paymentInstrumentHelper');

const {
    updateOrderBillingAddress,
    updateOrderShippingAddress
} = require('../scripts/monei/helpers/addressHelper');

const {
    moneiPaymentMethodId
} = require('../config/moneiPreferences');

server.get('GetPurchaseUnit', server.middleware.https, function (req, res, next) {
    const { currentBasket } = require('dw/order/BasketMgr');
    const cartFlow = req.querystring.isCartFlow === 'true';
    const purchase_units = [getPurchaseUnit(currentBasket, cartFlow)];
    session.privacy.orderDataHash = encodeString(purchase_units[0]);
    res.json({
        purchase_units: purchase_units
    });
    next();
});

server.use('UpdateOrderDetails', server.middleware.https, function (_, res, next) {
    const { currentBasket } = require('dw/order/BasketMgr');
    const purchase_unit = getPurchaseUnit(currentBasket);
    const isUpdateRequired = isPurchaseUnitChanged(purchase_unit);
    const paymentInstrument = getMoneiPaymentInstrument(currentBasket);

    if (isExpiredTransaction(paymentInstrument)) {
        removeMoneiPaymentInstrument(currentBasket);
        res.setStatusCode(500);
        res.json({
            transactionExpired: true,
            errorMsg: createErrorMsg('expiredpayment')
        });

        return next();
    }

    if (isUpdateRequired) {
        if (purchase_unit.amount.value === '0') {
            res.setStatusCode(500);
            res.json({
                errorMsg: createErrorMsg('zeroamount')
            });

            return next();
        }
        let { err } = updateOrderDetails(paymentInstrument, purchase_unit);
        if (err) {
            res.setStatusCode(500);
            res.json({
                errorMsg: err
            });
            return next();
        }
        session.privacy.orderDataHash = encodeString(purchase_unit);
        res.json({});
        return next();
    }
});




server.post('FinishLpmOrder', server.middleware.https, function (req, res, next) {
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var OrderMgr = require('dw/order/OrderMgr');
    var Order = require('dw/order/Order');
    var Status = require('dw/system/Status');
    var URLUtils = require('dw/web/URLUtils');

    const { details } = req.body && JSON.parse(req.body);
    const { currentBasket } = require('dw/order/BasketMgr');
    var paymentInstrument = createPaymentInstrument(currentBasket, 'MONEI');
    var paymentProcessor = PaymentMgr.getPaymentMethod('MONEI').getPaymentProcessor();

    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
        paymentInstrument.custom.moneiOrderID = details.id;
        paymentInstrument.custom.currentMoneiEmail = details.payer.email_address;
    });

    // Creates a new order.
    var order = COHelpers.createOrder(currentBasket);
    if (!order) {
        res.setStatusCode(500);
        res.print(createErrorMsg());
        return next();
    }

    // Update billing address.
    updateOrderBillingAddress(currentBasket, details.payer);

    // Places the order.
    try {
        Transaction.begin();
        var placeOrderStatus = OrderMgr.placeOrder(order);
        if (placeOrderStatus === Status.ERROR) throw new Error();
        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
        order.setExportStatus(Order.EXPORT_STATUS_READY);
        Transaction.commit();
    } catch (e) {
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
        createErrorLog(e);
        res.setStatusCode(500);
        res.print(e.message);
        return next();
    }

    // Clean up basket.
    removeMoneiPaymentInstrument(currentBasket);

    res.json({
        redirectUrl: URLUtils.https('Order-Confirm', 'ID', order.orderNo, 'token', order.orderToken).toString()
    });
    next();
});

// Create a payment
// We recommend that you create a Payment for each payment attempt.
server.post('Payments', server.middleware.https, function (req, res, next) {
    var Resource = require('dw/web/Resource');
    const { currentBasket } = require('dw/order/BasketMgr');
    var details  = JSON.parse(req.body);

    /////////////////////////
    if (details){
        var formFieldErrors = {};
        var message;
        var regex = /^[\w.%+-]+@[\w.-]+\.[\w]{2,6}$/; 
        if (!details.email || details.email.trim().length === 0) {
            message = Resource.msg('error.card.info.missing.email', 'forms', null);
            formFieldErrors['emailError'] = message;
            //formFieldErrors.set("email", message);
        }else if(!regex.test(details.email)){
            message = Resource.msg('error.message.parse.email.profile.form', 'forms', null);
            formFieldErrors['emailError'] = message;
            //formFieldErrors.set("email", message);
        }
        if(!details.phone  || details.phone.trim().length === 0){
            message = Resource.msg('error.card.info.missing.phone', 'forms', null);
            formFieldErrors['phoneError'] = message;
            //formFieldErrors.set("phone", message);
        }
    }else{
        message = Resource.msg('error.card.info.missing.email', 'forms', null);
        formFieldErrors['emailError'] = message;
        message = Resource.msg('error.card.info.missing.phone', 'forms', null);
        formFieldErrors['phoneError'] = message;
    }

    if(formFieldErrors.emailError ||  formFieldErrors.phoneError){
        res.json({
            fieldErrors: formFieldErrors,
            error: true
        });
        return next();
    }
    ///////////////////////////////

    const payment = getPaymentInfo(currentBasket, details.email,  details.phone); 
    session.privacy.orderDataHash = encodeString(payment);
    session.privacy.paymentEmail =  details.email;
    session.privacy.paymentPhone = details.phone;
    const paymentResponse = createPayment(payment);
    session.privacy.moneiPaymentId = paymentResponse.id;
    //tenemos el payment lo mandamos a través del API
    res.json({
        payment: paymentResponse
    });
    next();
});

// Receive a payment result
server.post('Callback', function (req, res, next) {
    var resp = verifySignature(req.body,req.httpHeaders['monei-signature']);
    //IS ANOTHER SESSION DIFFERENT FROM USER, SO WE STORE THE PAYMENT ID AN THE ORDER ID IN AN AUXILIAR TABLE
    Transaction.wrap(function () {
        var newTransaction = dw.object.CustomObjectMgr.createCustomObject('MoneiNewTransactions', resp.orderId);
        newTransaction.custom.moneiPaymentId = resp.id;
    });
    res.json(resp); 
   next();
});

module.exports = server.exports();
