'use strict';

function processForm(req, paymentForm, viewFormData) {
    var viewData = viewFormData;

    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value,
        htmlName: paymentForm.paymentMethod.htmlName
    };

    viewData.paymentInformation = {
        moneiToken: {
            value: paymentForm.moneiPaymentFields.moneiToken.value,
            htmlName: paymentForm.moneiPaymentFields.moneiToken.htmlName
        },
        moneiAmont: {
            value: paymentForm.moneiPaymentFields.moneiAmount.value,
            htmlName: paymentForm.moneiPaymentFields.moneiAmount.htmlName
        },
        moneiCurrency: {
            value: paymentForm.moneiPaymentFields.moneiCurrency.value,
            htmlName: paymentForm.moneiPaymentFields.moneiCurrency.htmlName
        },
        moneiSessionID: {
            value: paymentForm.moneiPaymentFields.moneiSessionID.value,
            htmlName: paymentForm.moneiPaymentFields.moneiSessionID.htmlName
        }
    };

    return {
        error: false,
        viewData: viewData
    };
}

exports.processForm = processForm;
