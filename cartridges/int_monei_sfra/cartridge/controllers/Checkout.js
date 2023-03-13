'use strict';

var page = module.superModule;
var server = require('server');
var Money = require('dw/value/Money');
var BasketMgr = require('dw/order/BasketMgr');
var formatMoney = require('dw/util/StringUtils').formatMoney;

var {
    isExpiredTransaction
} = require('../scripts/monei/helpers/moneiHelper');

var {
    getMoneiNewTransaction
} = require('../scripts/monei/moneiUtils');

var {
    getMoneiPaymentInstrument,
    removeMoneiPaymentInstrument
} = require('../scripts/monei/helpers/paymentInstrumentHelper');
const prefs = require('../config/moneiPreferences');

server.extend(page);

server.append('Begin', function (_, res, next) {
    var basket = BasketMgr.getCurrentBasket();
    var currency = basket.getCurrencyCode();
    var moneiPaymentInstrument = getMoneiPaymentInstrument(basket);
    var paymentAmount = new Money(0, currency);
    var moneiPaymentID = _.querystring.id;
    var orderId = _.querystring.orderId;
    var status = _.querystring.status;
    var amount;
    var hasDefaultPaymentMethod;
    
    if (!moneiPaymentID || !orderId){
        if (isExpiredTransaction(moneiPaymentInstrument)) {
            removeMoneiPaymentInstrument(basket);
        }

        if (moneiPaymentInstrument) {
            amount = moneiPaymentInstrument.paymentTransaction.amount.value;
            paymentAmount = new Money(amount, currency);
            if (moneiPaymentInstrument.custom.moneiPaymentID) {
                moneiPaymentID = moneiPaymentInstrument.custom.moneiPaymentID;
            }
        }

        res.setViewData({
            monei: {
                paymentAmount: formatMoney(paymentAmount),
                prefs: prefs,
                partnerAttributionId: prefs.partnerAttributionId,
                hasDefaultPaymentMethod: hasDefaultPaymentMethod,
                moneiPaymentID: moneiPaymentID,
                orderId:orderId
            }
        });
        next();
    }else{
        if (status=== 'FAILED' || status === 'PaymentCanceled'){
            res.setViewData({monei:{
                error: _.querystring.message
                }
            });
            next();
        }else if (status=== 'AUTHORIZED'){
            //Check if payment was correct
            var moneiOrders = getMoneiNewTransaction(orderId, moneiPaymentID);
            if (moneiOrders && moneiOrders.hasNext()){
                if (moneiPaymentInstrument) {
                    amount = moneiPaymentInstrument.paymentTransaction.amount.value;
                    paymentAmount = new Money(amount, currency);
                    if (moneiPaymentInstrument.custom.moneiPaymentID) {
                        moneiPaymentID = moneiPaymentInstrument.custom.moneiPaymentID;
                    }else{
                        Transaction.wrap(function () {
                            moneiPaymentInstrument.custom.moneiPaymentID = _.querystring.id;
                        });
                    }
                
                }
                res.setViewData({
                    monei: {
                        paymentAmount: formatMoney(paymentAmount),
                        prefs: prefs,
                        partnerAttributionId: prefs.partnerAttributionId,
                        hasDefaultPaymentMethod: hasDefaultPaymentMethod,
                        moneiPaymentID: _.querystring.id,
                        orderId: orderId
                    }
                });
                next();
            }else{
                //VOLVEMOS A COMPROBAR DESPUES DE 3 SEGUNDOS
               setTimeout(function(){var moneiOrders = getMoneiNewTransaction(orderId, moneiPaymentID);
                if (moneiOrders && moneiOrders.hasNext()){
                    if (moneiPaymentInstrument) {
                        amount = moneiPaymentInstrument.paymentTransaction.amount.value;
                        paymentAmount = new Money(amount, currency);
                        if (moneiPaymentInstrument.custom.moneiPaymentID) {
                            moneiPaymentID = moneiPaymentInstrument.custom.moneiPaymentID;
                        }
                    }
                    res.setViewData({
                        monei: {
                            paymentAmount: formatMoney(paymentAmount),
                            prefs: prefs,
                            partnerAttributionId: prefs.partnerAttributionId,
                            hasDefaultPaymentMethod: hasDefaultPaymentMethod,
                            moneiPaymentID: _.querystring.id,
                            orderId: orderId
                        }
                    });
                }else{
                    res.setViewData({monei:{
                        error:"No se ha encontrado el pago asociado"
                        }
                    });
                }
                
             next();
            }, 3000);
                
            }
        }
    }
});


module.exports = server.exports();
