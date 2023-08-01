/* global monei creditCustomStyles */

var moneiOrderData = {};
var credit;
var bizum;
var paymentrequest;
var currentlyCalling = false;
var confirmationPaymentErrorStatus = [
    'FAILED',
    'CANCELED',
    'EXPIRED'
];

function moneiTokenHandler(token) {
    $('[name="dwfrm_billing_moneiPaymentFields_moneiToken"]').val(token);
    $('[name="dwfrm_billing_moneiPaymentFields_moneiAmount"]').val(moneiOrderData.amount);
    $('[name="dwfrm_billing_moneiPaymentFields_moneiCurrency"]').val(moneiOrderData.currency);
}

function initBizum() {
    if (bizum) {
        bizum.close();
    }

    bizum = monei.Bizum({ // eslint-disable-new-cap
        accountId: $('[name="monei_id"]').val(),
        sessionId: $('[name="dwfrm_billing_moneiPaymentFields_moneiSessionID"]').val(),
        amount: moneiOrderData.amount,
        currency: moneiOrderData.currency,
        language: $('[name="monei_lang"]').val(),
        onSubmit(result) {
            moneiTokenHandler(result.token);
            $('.submit-payment').trigger('click');
        },
        onError(error) {
            $('.monei-error').html(error);
            $('.monei-error').show();
        }
    });
    bizum.render('#monei-bizum-content .monei-bizum-button-container');
}

function initCredit() {
    if (credit) {
        credit.close();
    }

    credit = monei.CardInput({ // eslint-disable-new-cap
        accountId: $('[name="monei_id"]').val(),
        sessionId: $('[name="dwfrm_billing_moneiPaymentFields_moneiSessionID"]').val(),
        language: $('[name="monei_lang"]').val(),
        style: typeof creditCustomStyles !== 'undefined' ? creditCustomStyles : null,
        onFocus: function () {
            $('#monei-credit-content .monei-credit-card-input').addClass('is-focused');
        },
        onBlur: function () {
            $('#monei-credit-content .monei-credit-card-input').removeClass('is-focused');
        },
        onChange: function (event) {
            if (event.isTouched && event.error) {
                $('#monei-credit-content .monei-credit-card-input').addClass('is-invalid');
                $('#monei-credit-content .monei-error').html(event.error);
            } else {
                $('#monei-credit-content .monei-credit-card-input').removeClass('is-invalid');
                $('#monei-credit-content .monei-error').html('');
            }
        }
    });
    credit.render('#monei-credit-content .monei-credit-card-input');
}

function initPaymentrequest() {
    if (paymentrequest) {
        paymentrequest.close();
    }

    paymentrequest = monei.PaymentRequest({ // eslint-disable-new-cap
        accountId: $('[name="monei_id"]').val(),
        sessionId: $('[name="dwfrm_billing_moneiPaymentFields_moneiSessionID"]').val(),
        amount: moneiOrderData.amount,
        currency: moneiOrderData.currency,
        language: $('[name="monei_lang"]').val(),
        onSubmit(result) {
            moneiTokenHandler(result.token);
            $('.submit-payment').trigger('click');
        },
        onLoad(isSupported) {
            if (!isSupported) {
                $('.nav-item[data-method-id="MONEI_PAYMENTREQUEST"]').hide();
            }
        },
        onError(error) {
            $('.monei-error').html(error);
            $('.monei-error').show();
        }
    });
    paymentrequest.render('#monei-paymentrequest-content .monei-paymentrequest-button-container');
}

function manageCreditForm () {
    $('#monei-credit-content .monei-credit-name-input input').off('focus').on('focus', function() {
        $('#monei-credit-content .monei-credit-name-input').addClass('is-focused');
    });
    $('#monei-credit-content .monei-credit-name-input input').off('blur').on('blur', function() {
        $('#monei-credit-content .monei-credit-name-input').removeClass('is-focused');
    });
    $('#monei-credit-content .monei-credit-name-input input').off('change.validation blur.validation').on('change.validation blur.validation', function() {
        if ($('#monei-credit-content .monei-credit-name-input input').val() === "") {
            $('#monei-credit-content .monei-credit-name-input').addClass('is-invalid');
            $('#monei-credit-content .monei-error').html($('#monei-credit-content .monei-credit-name-input input').data('missing-error'));
        } else {
            $('#monei-credit-content .monei-credit-name-input').removeClass('is-invalid');
            $('#monei-credit-content .monei-error').html('');
        }
    });

    $('button.submit-payment').off('click.ccard').on('click.ccard', function (e) {
        var moneyPaymentMethod = window.localStorage.getItem('monei_card_payment');
        if (credit) {
            var activeTabId = $('.tab-pane.active').attr('id');
            var paymentInfoSelector = '#dwfrm_billing .' + activeTabId + ' .payment-form-fields input.form-control';
            var selectedPaymentMethod = $(paymentInfoSelector).val();

            if (selectedPaymentMethod === 'MONEI_CREDIT' && !moneyPaymentMethod) {
                e.stopImmediatePropagation();
                window.localStorage.setItem('monei_card_payment', true);

                if ($('#monei-credit-content .monei-credit-name-input input').val() == '') {
                    $('#monei-credit-content .monei-credit-name-input').addClass('is-invalid');
                    $('#monei-credit-content .monei-error').html($('#monei-credit-content .monei-credit-name-input input').data('missing-error'));
                    window.localStorage.removeItem('monei_card_payment');
                    return;
                }

                $('body').trigger('checkout:disableButton', '.next-step-button button');

                monei.createToken(credit).then(function (result) {
                    if (result.error) {
                        $('#monei-credit-content .monei-credit-card-input').addClass('is-invalid');
                        $('#monei-credit-content .monei-error').html(result.error);
                    } else {
                        moneiTokenHandler(result.token);
                        $('body').trigger('checkout:enableButton', '.next-step-button button');
                        $('.submit-payment').click();
                    }
                })
                .catch(function () {
                    window.localStorage.removeItem('monei_card_payment');
                    $('body').trigger('checkout:enableButton', '.next-step-button button');
                });
            }
        }
    });
}

function ensureMoneiContentVisibility() {
    if ($('.monei-tab').hasClass('active')) {
        setTimeout(function () {
            var $paymentOptionsTabs = $('.payment-options a[data-toggle="tab"]');
            var $content = $($('.monei-tab.active').attr('href'));
            if ($content.length > 0) {
                $paymentOptionsTabs.trigger('shown.bs.tab');
                $content.addClass('active');
            }
        }, 250);
    }
}

function renderMoneiComponents() {
    if ($('#monei-bizum-content').length > 0) {
        initBizum();
    }
    if ($('#monei-credit-content').length > 0) {
        initCredit();
        manageCreditForm();
    }
    if ($('#monei-paymentrequest-content').length > 0) {
        initPaymentrequest();
    }
}

function managePaymentSelections() {
    var $paymentOptionsTabs = $('.payment-options a[data-toggle="tab"]');
    $paymentOptionsTabs.on('shown.bs.tab', function (e) {
        $paymentOptionsTabs.each(function () {
            var $tabLink = $(this);
            var tabId = $tabLink.attr('href');
            var $tabContent = $(tabId);

            if (this === e.target) {
                $tabContent.find('input, textarea, select').removeAttr('disabled', 'disabled');
            } else {
                $tabContent.find('input, textarea, select').attr('disabled', 'disabled');
            }
        });

        setTimeout(function () {
            var $submitPaymentBtn = $('.submit-payment');
            if ($(e.target).hasClass('active')) {
                var currentPaymentId = $(e.target).parent().attr('data-method-id').toLowerCase();
                if (currentPaymentId.indexOf('monei_bizum') > -1 || currentPaymentId.indexOf('monei_paymentrequest') > -1) {
                    $submitPaymentBtn.hide();
                }
            }
        }, 100);
    });

    $('body').on('checkout:updateCheckoutView', function () {
        ensureMoneiContentVisibility();
    });

    $(window).on('popstate', function () {
        ensureMoneiContentVisibility();
    });

    $('.payment-summary .edit-button').on('click', function () {
        ensureMoneiContentVisibility();
    });
}

function checkOrderDataForRendering(order) {
    var recreateFlag = false;
    if (Object.prototype.hasOwnProperty.call(order, 'moneiOrderData')) {
        if (Object.prototype.hasOwnProperty.call(moneiOrderData, 'currency')) {
            if (moneiOrderData.currency !== order.moneiOrderData.currency) {
                recreateFlag = true;
            }
        } else {
            recreateFlag = true;
        }
        moneiOrderData.currency = order.moneiOrderData.currency;

        if (Object.prototype.hasOwnProperty.call(moneiOrderData, 'amount')) {
            if (moneiOrderData.amount !== order.moneiOrderData.amount) {
                moneiOrderData.amount = order.moneiOrderData.amount;
                recreateFlag = true;
            }
        } else {
            recreateFlag = true;
        }
        moneiOrderData.amount = order.moneiOrderData.amount;
    }

    return recreateFlag;
}

function getOrderData() {
    if ($('[name="monei_dataEndpoint"]').length > 0) {
        $.ajax({
            url: $('[name="monei_dataEndpoint"]').val(),
            type: 'POST',
            dataType: 'json',
            success: function (data) {
                if (checkOrderDataForRendering(data.order)) {
                    renderMoneiComponents();
                }
            }
        });
    }
}

function switchPlaceOrderBtn() {
    var $placeOrderBtn = $('.place-order');
    var $moneiPlaceOrderBtn = $('.monei-place-order');
    var currentStage = $('.data-checkout-stage').attr('data-checkout-stage');

    if (currentStage === 'placeOrder' || currentStage === 'submitted') {
        var $selectedPaymentOptionEl = $('.payment-information .nav-link.active').closest('li');
        var selectedPaymentOptionId = $selectedPaymentOptionEl.attr('data-method-id');

        if (selectedPaymentOptionId.toLowerCase().indexOf('monei') > -1) {
            $moneiPlaceOrderBtn.show();
            if (!currentlyCalling) {
                $moneiPlaceOrderBtn.find('.monei-button').prop('disabled', false);
            }
            $placeOrderBtn.hide();
            $placeOrderBtn.prop('disabled', true);
        } else {
            $placeOrderBtn.show();
            $placeOrderBtn.prop('disabled', false);
            $moneiPlaceOrderBtn.hide();
            $moneiPlaceOrderBtn.find('.monei-button').prop('disabled', true);
        }
    } else {
        $moneiPlaceOrderBtn.hide();
    }
}

function failCreatedOrderAsync(orderId, restoreBasket) {
    if ($('[name="monei_failOrderEndpoint"]').length > 0) {
        $.ajax({
            url: $('[name="monei_failOrderEndpoint"]').val(),
            method: 'POST',
            data: {
                orderId: orderId,
                restoreBasket: restoreBasket
            },
            success: function (data) {
                if (!data.error && data.redirectUrl) {
                    window.location.href = data.redirectUrl;
                } else {
                    window.location.href = $('[name="monei_cartEndpoint"]').val();
                }
            },
            error: function () {
                window.location.href = $('[name="monei_cartEndpoint"]').val();
            },
            complete: function () {
                $('body').trigger('checkout:enableButton', '.next-step-button button');
            }
        });
    }
}

function placeCreatedOrderAsync(result, orderId) {
    if ($('[name="monei_placeOrderEndpoint"]').length > 0) {
        $.ajax({
            url: $('[name="monei_placeOrderEndpoint"]').val(),
            method: 'POST',
            data: {
                orderId: orderId,
                paymentResult: result.status
            },
            success: function (data) {
                if (!data.error) {
                    var continueUrl = data.continueUrl;
                    var urlParams = {
                        ID: data.orderId,
                        token: data.orderToken ? data.orderToken : null
                    };

                    continueUrl += (continueUrl.indexOf('?') !== -1 ? '&' : '?') +
                        Object.keys(urlParams).map(function (key) {
                            return key + '=' + encodeURIComponent(urlParams[key]);
                        }).join('&');

                    if (result.nextAction && result.nextAction.mustRedirect) {
                        window.location.href = result.nextAction.redirectUrl;
                    } else {
                        window.location.href = continueUrl;
                    }
                } else {
                    failCreatedOrderAsync(orderId, true);
                }
            },
            error: function () {
                failCreatedOrderAsync(orderId, true);
            }
        });
    }
}

function moneiComponentConfirmPayment(token, paymentId, orderId) {
    monei.confirmPayment({
        paymentId: paymentId,
        paymentToken: token
    }).then(function (result) {
        if (result && result.status && confirmationPaymentErrorStatus.indexOf(result.status) > -1) {
            failCreatedOrderAsync(orderId, true);
        } else {
            placeCreatedOrderAsync(result, orderId);
        }
    }).catch(function () {
        failCreatedOrderAsync(orderId, true);
    });
}

function createOrderAsync() {
    if ($('[name="monei_createOrderEndpoint"]').length > 0) {
        $('body').trigger('checkout:disableButton', '.next-step-button button');
        $.ajax({
            url: $('[name="monei_createOrderEndpoint"]').val(),
            method: 'POST',
            success: function (data) {
                if (data.error) {
                    if (data.redirectUrl) {
                        window.location.href = data.redirectUrl;
                    }
                    if (data.errorMessage) {
                        $('body').trigger('checkout:enableButton', '.next-step-button button');
                        if ($('.error-message').length > 0) {
                            $('.error-message').show();
                            $('.error-message-text').text(data.errorMessage);
                        }
                    }
                } else if (typeof data.orderMoneiToken !== 'undefined' && typeof data.orderMoneiPaymentId !== 'undefined') {
                    moneiComponentConfirmPayment(data.orderMoneiToken, data.orderMoneiPaymentId, data.orderId);
                }
            },
            error: function () {
                $('body').trigger('checkout:enableButton', '.next-step-button button');
            }
        });
    }
}

function generatePlaceOrderButton() {
    var $placeOrderBtn = $('.place-order');
    var $moneiPlaceOrderBtnContainer = $('<div></div>');
    var $moneiBtn = $('<button type="submit"></button>');
    $moneiPlaceOrderBtnContainer.addClass('monei-place-order');
    $moneiBtn.addClass('btn').addClass('btn-primary').addClass('monei-button');
    $moneiBtn.text($('.place-order').text().trim().toString());
    $moneiPlaceOrderBtnContainer.append($moneiBtn);
    $moneiPlaceOrderBtnContainer.insertAfter($placeOrderBtn);

    $moneiPlaceOrderBtnContainer.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (!$('.monei-button').prop('disabled')) {
            currentlyCalling = true;
            $('body').trigger('checkout:disableButton', '.next-step-button button');
            createOrderAsync();
        }
    });
    $moneiPlaceOrderBtnContainer.hide();
}

var initMonei = function () {
    var iteration = 0;
    var moneiInterval = setInterval(function () {
        if (typeof monei !== 'undefined') {
            if ($('.monei-content').length > 0) {
                getOrderData();
                clearInterval(moneiInterval);
            }
        } else {
            iteration += 250;
        }

        if (iteration > 5000) {
            clearInterval(moneiInterval);
        }
    }, 250);

    generatePlaceOrderButton();
    switchPlaceOrderBtn();
    managePaymentSelections();
    window.localStorage.removeItem('monei_card_payment');

    $('body').on('checkout:updateCheckoutView', function (e, data) {
        window.localStorage.removeItem('monei_card_payment');
        if (checkOrderDataForRendering(data.order)) {
            renderMoneiComponents();
        }
    });

    setInterval(function () {
        switchPlaceOrderBtn();
    }, 100);
};

module.exports = {
    initMonei: initMonei
};
