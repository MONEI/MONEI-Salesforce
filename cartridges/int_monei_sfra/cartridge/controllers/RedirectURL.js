'use strict';

var server = require('server');
server.extend(module.superModule);

server.prepend('Start', function (req, res, next) {
    var URLRedirectMgr = require('dw/web/URLRedirectMgr');
    var origin = URLRedirectMgr.redirectOrigin;

    if (origin.indexOf('apple-developer-merchantid-domain') > -1) {
        var merchantidDomainVerificationPref = dw.system.Site.getCurrent().getCustomPreferenceValue('MONEI_Applepay_Verification');
        if (!empty(merchantidDomainVerificationPref)) {
            res.setContentType('text/plain');
            res.print(merchantidDomainVerificationPref);
            this.emit('route:Complete', req, res);
        }
    } else {
        next();
    }
});

module.exports = server.exports();
