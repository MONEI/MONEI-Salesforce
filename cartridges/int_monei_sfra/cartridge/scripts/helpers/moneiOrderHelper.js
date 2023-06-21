'use strict';

var OrderMgr = require('dw/order/OrderMgr');
var Order = require('dw/order/Order');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var moneiPreferences = require('*/cartridge/config/moneiPreferences');

function updateNotifiedOrder(result, currentLocale) {
    if (!empty(result)) {
        if (Object.prototype.hasOwnProperty.call(result, 'orderId') && Object.prototype.hasOwnProperty.call(result, 'status')) {
            var notifiedStatus = result.status;
            var orderId = result.orderId;
            var order = OrderMgr.getOrder(orderId);
            var result;

            if (order) {
                if (status === moneiPreferences.status.CANCELLED || status === moneiPreferences.status.FAILED || status === moneiPreferences.status.EXPIRED) {
                    result = cancelOrFailOrder(order, false);

                    if (!result) {
                        createErrorLog('Notification on order ' + orderId + ' attempted cancellation but returned error');
                    }
                } else if (status === moneiPreferences.status.PENDING || status === moneiPreferences.status.SUCCEEDED) {
                    result = placeOrder(order, currentLocale, null, false);

                    if (result.error) {
                        createErrorLog('Notification on order ' + orderId + ' attempted cancellation but returned error');
                    }
                } else if (status === moneiPreferences.status.AUTHORIZED) {
                    result = placeOrder(order, currentLocale, status, false);

                    if (result.error) {
                        createErrorLog('Notification on order ' + orderId + ' attempted placing and update but returned error');
                    }
                }
            } else {
                createErrorLog('Notified order not found: ' + orderId)
            }
        }
    }
}

function createOrder(req, currentBasket) {
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var hooksHelper = require('*/cartridge/scripts/helpers/hooks');
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var validationHelpers = require('*/cartridge/scripts/helpers/basketValidationHelpers');

    var result = {
        error: true,
        orderId: null,
        errorMessage: Resource.msg('error.technical', 'checkout', null)
    };

    if (empty(currentBasket) || empty(currentBasket.custom.moneiOrderNo)) {
        return result;
    }

    result.orderId = currentBasket.custom.moneiOrderNo;

    // Executes order products validation helper
    var validatedProducts = validationHelpers.validateProducts(currentBasket);
    if (validatedProducts.error) {
        return result;
    }

    // Executes order generic validation helper
    var validationOrderStatus = hooksHelper('app.validate.order', 'validateOrder', currentBasket, require('*/cartridge/scripts/hooks/validateOrder').validateOrder);
    if (validationOrderStatus.error) {
        result.errorMessage = validationOrderStatus.message;
        return result;
    }

    // Checks if shipping address exist
    if (currentBasket.defaultShipment.shippingAddress === null) {
        session.custom.moneiErrorMessage = Resource.msg('error.no.shipping.address', 'checkout', null);
        result.redirectUrl = URLUtils.url('Checkout-Begin', 'showMoneiError', true, 'stage', 'shipping').toString();
        return result;
    }

    // Checks if billing address exist
    if (!currentBasket.billingAddress) {
        session.custom.moneiErrorMessage = Resource.msg('error.no.billing.address', 'checkout', null);
        result.redirectUrl = URLUtils.url('Checkout-Begin', 'showMoneiError', true, 'stage', 'payment').toString();
        return result;
    }

    // Calculate the basket
    Transaction.wrap(function () {
        basketCalculationHelpers.calculateTotals(currentBasket);
    });

    // Re-validates existing payment instruments
    var validPayment = COHelpers.validatePayment(req, currentBasket);
    if (validPayment.error) {
        session.custom.moneiErrorMessage = Resource.msg('error.payment.not.valid', 'checkout', null);
        result.redirectUrl = URLUtils.url('Checkout-Begin', 'showMoneiError', true, 'stage', 'payment').toString();
        return result;
    }

    // Re-calculate the payments
    var calculatedPaymentTransactionTotal = COHelpers.calculatePaymentTransaction(currentBasket);
    if (calculatedPaymentTransactionTotal.error) {
        return result;
    }

    var order;
    Transaction.wrap(function () {
        order = OrderMgr.createOrder(currentBasket, currentBasket.custom.moneiOrderNo);
    });

    if (order) {
        result.orderMoneiToken = order.custom.moneiToken;
        result.orderMoneiPaymentId = order.paymentInstruments[0].custom.moneiPaymentID;
        result.error = false;
    }

    return result;
}

function cancelOrFailOrder(order, restoreBasket) {
    var error = true;

    if (order) {
        if (order.getStatus() == Order.ORDER_STATUS_CREATED) {
            var BasketMgr = require('dw/order/BasketMgr');
            Transaction.wrap(function () {
                order.addNote('Monei', 'failing order');
                OrderMgr.failOrder(order, restoreBasket);
                if (restoreBasket) {
                    BasketMgr.createBasketFromOrder(order);
                }
                session.custom.moneiErrorMessage = Resource.msg('error.technical', 'checkout', null);
                error = false;
            });
        }
        if (order.getStatus() !== Order.ORDER_STATUS_CREATED && order.getStatus() !== Order.ORDER_STATUS_FAILED) {
            Transaction.wrap(function () {
                order.addNote('Monei', 'cancelling order');
                OrderMgr.cancelOrder(order);
                session.custom.moneiErrorMessage = Resource.msg('error.technical', 'checkout', null);
                error = false;
            });
        }
    }

    return error;
}

function undoCancelOrFailOrder(order) {
    var error = true;

    if (!empty(order)) {
        if (order.getStatus() == Order.ORDER_STATUS_FAILED) {
            Transaction.wrap(function () {
                order.addNote('Monei', 'undoing fail order');
                OrderMgr.undoFailOrder(order);
                error = false;
            });
        }
        if (order.getStatus() == Order.ORDER_STATUS_CANCELLED) {
            Transaction.wrap(function () {
                order.addNote('Monei', 'undoing cancel order');
                OrderMgr.undoCancelOrder(order);
                error = false;
            });
        }
    }

    return error;
}

function placeOrder(order, currentLocale, paymentResult, restoreBasket) {
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var URLUtils = require('dw/web/URLUtils');
    var hooksHelper = require('*/cartridge/scripts/helpers/hooks');

    if (order) {
        undoCancelOrFailOrder(order);

        if (order.getStatus() == Order.ORDER_STATUS_CREATED) {
            // Handles payment authorization
            var handlePaymentResult = COHelpers.handlePayments(order, order.orderNo);
            if (handlePaymentResult.error) {
                return {
                    error: true
                };
            }

            var fraudDetectionStatus = hooksHelper('app.fraud.detection', 'fraudDetection', order, require('*/cartridge/scripts/hooks/fraudDetection').fraudDetection);
            if (fraudDetectionStatus.status === 'fail') {
                var failOrder = cancelOrFailOrder(order, restoreBasket);
                if (failOrder) {
                    return {
                        error: true
                    };
                }
            }
            var placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);
            if (placeOrderResult.error) {
                return {
                    error: true
                };
            }

            COHelpers.sendConfirmationEmail(order, currentLocale);
        }

        if (paymentResult) {
            Transaction.wrap(function () {
                order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
            });
        }
    }
    return {
        error: false
    };
}

module.exports = {
    updateNotifiedOrder: updateNotifiedOrder,
    createOrder: createOrder,
    cancelOrFailOrder: cancelOrFailOrder,
    undoCancelOrFailOrder: undoCancelOrFailOrder,
    placeOrder: placeOrder
};
