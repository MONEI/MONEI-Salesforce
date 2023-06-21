'use strict';

var base = module.superModule;

function OrderModel(lineItemContainer, options) {
    base.call(this, lineItemContainer, options);

    if (!lineItemContainer) {
        this.moneiOrderData = null;
    } else {
        this.moneiOrderData = {
            amount: Math.round(lineItemContainer.getTotalGrossPrice().value * 100),
            currency: lineItemContainer.currencyCode
        };
    }
}

module.exports = OrderModel;
