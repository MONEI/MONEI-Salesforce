'use strict';


var formHelpers = require('./formErrors');
var scrollAnimate = require('./scrollAnimate');


$( document ).ready(function() {
    $(".monei-tab").trigger('click');
    $("button[type='submit'].submit-payment").trigger('click');
});