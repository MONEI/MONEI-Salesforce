'use strict';

var page = module.superModule;
var server = require('server');

var Transaction = require('dw/system/Transaction');
var HookMgr = require('dw/system/HookMgr');

var Locale = require('dw/util/Locale');
var BasketMgr = require('dw/order/BasketMgr');

var AccountModel = require('*/cartridge/models/account');
var OrderModel = require('*/cartridge/models/order');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

var {
    isExpiredTransaction,
    isErrorEmail,
    createErrorEmailResponse,
    getPurchaseUnit,
    isPurchaseUnitChanged,
    basketModelHack,
    updateCustomerEmail,
    updateCustomerPhone
} = require('../scripts/monei/helpers/moneiHelper');

var {
    getMoneiPaymentInstrument,
    removeMoneiPaymentInstrument,
    removeNonMoneiPaymentInstrument
} = require('../scripts/monei/helpers/paymentInstrumentHelper');
const {
    updateOrderDetails,
    getOrderDetail
} = require('../scripts/monei/moneiAPI');

const {
    encodeString,
    createErrorMsg,
    getUrls
} = require('../scripts/monei/moneiUtils');

const {
    moneiPaymentMethodId
} = require('../config/moneiPreferences');


const {
    updateOrderBillingAddress
} = require('../scripts/monei/helpers/addressHelper');



server.extend(page);

server.append('SubmitPayment', server.middleware.https, csrfProtection.validateAjaxRequest, function (req, res, next) {
    var basket = BasketMgr.getCurrentBasket();
    var currencyCode = basket.getCurrencyCode();
    var moneiPaymentInstrument = getMoneiPaymentInstrument(basket);
    var paymentInstruments = basket.getPaymentInstruments();
    var billingData = res.getViewData();
    var billingForm = server.forms.getForm('billing');
    var isUserHasActiveSessionAccount = moneiPaymentInstrument && moneiPaymentInstrument.custom && (moneiPaymentInstrument.custom.moneiPaymentID===null?false:moneiPaymentInstrument.custom.moneiPaymentID);

    if (isExpiredTransaction(moneiPaymentInstrument)) {
        removeMoneiPaymentInstrument(basket);
        res.json({
            form: billingForm,
            fieldErrors: [],
            serverErrors: [createErrorMsg('expiredpayment')],
            error: true,
            redirectUrl: getUrls().paymentStage,
            cartError: true
        });
        this.emit('route:Complete', req, res);
        return;
    }

    if (billingForm.paymentMethod.htmlValue !== moneiPaymentMethodId) {
        // if change payment from monei to different one we remove monei as payment instrument
        if (moneiPaymentInstrument) {
            removeMoneiPaymentInstrument(basket);
        }

        next();
        return;
    }

    // if change payment method from different one to monei we remove already existing payment instrument
    if (!empty(paymentInstruments) && !moneiPaymentInstrument && billingForm.paymentMethod.htmlValue === moneiPaymentMethodId) {
        removeNonMoneiPaymentInstrument(basket);
    }

    if (!moneiPaymentInstrument) {
        billingData.paymentMethod = {
            value: moneiPaymentMethodId
        };
        billingData.paymentInformation = {
            billingForm: billingForm
        };
        res.setViewData(billingData);

        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
            var currentBasket = BasketMgr.getCurrentBasket();
            var viewData = res.getViewData();

           
            basketModelHack(viewData.order, currencyCode);

            res.json(viewData);
        });

        return next();
    }

    if (isErrorEmail(billingData)) {
        res.json(createErrorEmailResponse(billingData));
        this.emit('route:Complete', req, res);
        return;
    }

    updateCustomerEmail(basket, billingData);
    updateCustomerPhone(basket, billingData);

   
    var noOrderIdChange = isUserHasActiveSessionAccount && moneiPaymentInstrument.custom.moneiPaymentID === billingForm.monei.moneiPaymentID.htmlValue;
    // if user goes through checkout with the same session account we update order details if needed
    if (noOrderIdChange) {
        //habría que pillar el getPaymentInfo
        const purchase_unit = getPurchaseUnit(basket);
        if (purchase_unit.amount.value === '0') {
            res.json({
                form: billingForm,
                fieldErrors: [],
                serverErrors: [createErrorMsg('zeroamount')],
                error: true
            });
            this.emit('route:Complete', req, res);
            return;
        }
        const isUpdateRequired = isPurchaseUnitChanged(purchase_unit);
        if (isUpdateRequired) {
            let { err } = updateOrderDetails(moneiPaymentInstrument, purchase_unit);
            if (err) {
                res.json({
                    form: billingForm,
                    fieldErrors: [],
                    serverErrors: [err],
                    error: true
                });
                this.emit('route:Complete', req, res);
                return;
            }
            session.privacy.orderDataHash = encodeString(purchase_unit);
        }
    }
    var isOrderIdChanged = isUserHasActiveSessionAccount && moneiPaymentInstrument.custom.moneiPaymentID !== billingForm.monei.moneiPaymentID.htmlValue;
    // if user changes one session account to another we update billing address and email
    if (isOrderIdChanged) {
        Transaction.wrap(function () {
            moneiPaymentInstrument.custom.moneiPaymentID = billingForm.monei.moneiPaymentID.htmlValue;
        });
        //TENDREMOS QUE BORRAR EL PAGO Y DAR ERROR
        let { payer, err } = getOrderDetails(moneiPaymentInstrument);
        if (err) {
            res.json({
                form: billingForm,
                fieldErrors: [],
                serverErrors: [err],
                error: true
            });
            this.emit('route:Complete', req, res);
            return;
        }
        updateOrderBillingAddress(basket, payer);
        session.privacy.moneiPayerEmail = payer.email_address;
    }

    Transaction.wrap(function () {
        HookMgr.callHook('dw.order.calculate', 'calculate', basket);
    });

    var usingMultiShipping = false; // Current integration support only single shpping
    req.session.privacyCache.set('usingMultiShipping', usingMultiShipping);
    var currentLocale = Locale.getLocale(req.locale.id);

    var basketModel = new OrderModel(basket, { usingMultiShipping: usingMultiShipping, countryCode: currentLocale.country, containerView: 'basket' });

    
    basketModelHack(basketModel, currencyCode);

    res.json({
        customer: new AccountModel(req.currentCustomer),
        order: basketModel,
        form: billingForm,
        fieldErrors: [],
        error: false
    });
    this.emit('route:Complete', req, res);
});

module.exports = server.exports();
