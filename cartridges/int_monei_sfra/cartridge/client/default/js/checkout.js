'use strict';

var processInclude = require('base/util');

$(document).ready(function () { // eslint-disable-line
    processInclude(require('./checkout/checkout'));
    processInclude(require('./monei/moneiCheckout'));
});
