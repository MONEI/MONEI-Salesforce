'use strict';

$(document).ready(function () {
    require('./formErrors');
    require('./scrollAnimate');

    $('.monei-tab').trigger('click');
    $('button[type="submit"].submit-payment').trigger('click');
});
