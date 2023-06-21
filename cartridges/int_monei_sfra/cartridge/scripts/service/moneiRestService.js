'use strict';

var Resource = require('dw/web/Resource');
var moneiHelper = require('*/cartridge/scripts/helpers/moneiHelper');
var moneiPreferences = require('*/cartridge/config/moneiPreferences');
var moneiHelper = require('*/cartridge/scripts/helpers/moneiHelper');

/** 
 * createRequest callback for a service
 * @param  {dw.svc.Service} service service instance
 * @param  {Object} data call data with path, method, body for a call or createToken in case of recursive call
 * @returns {string} request body
 */
function createRequest(service, data) {
    var credential = service.configuration.credential;
    var ServiceCredential = require('dw/svc/ServiceCredential');
    if (!(credential instanceof ServiceCredential)) {
        throw new Error(Resource.msgf('service.nocredentials', 'moneierrors', null, moneiHelper.getServiceName()));
    }
    var { path, method, body} = data;

    service.setURL(moneiHelper.getUrlPath(credential.URL, path));
    service.addHeader('Content-Type', 'application/json');
    service.setRequestMethod(method || 'POST');
    service.addHeader('Authorization', moneiPreferences.getApiKey());
    service.addHeader('User-Agent', Resource.msgf('monei.useragent', 'monei', null, Resource.msg('monei.version.number', 'monei_version', null)));

    return body ? JSON.stringify(body) : '';
}

module.exports = (function () {
    var restService;
    try {
        restService = require('dw/svc/LocalServiceRegistry').createService(moneiHelper.getServiceName(), {
            createRequest: createRequest,
            parseResponse: function (_, httpClient) {
                return JSON.parse(httpClient.getText());
            },
            getRequestLogMessage: function (request) {
                return request;
            },
            getResponseLogMessage: function (response) {
                return response.text;
            }
        });
    } catch (error) {
        moneiHelper.createErrorLog(Resource.msgf('service.error', 'moneierrors', null, moneiHelper.getServiceName()));
        throw new Error();
    }

    return {
        call: function (data) {
            var result;
            try {
                result = restService.setThrowOnError().call(data);
            } catch (error) {
                moneiHelper.createErrorLog(Resource.msgf('service.generalerror', 'moneierrors', null, moneiHelper.getServiceName()));
                throw new Error();
            }
            if (result.isOk()) {
                return restService.response;
            }
            if (!result.message) {
                moneiHelper.createErrorLog(Resource.msgf('service.wrongendpoint', 'moneierrors', null, data.path));
                throw new Error();
            }

            var errorMessage;
            var errorData = JSON.parse(result.message);
            if (errorData) {
                errorMessage = errorData;
            } 

            throw new Error(errorMessage.toLowerCase());
        }
    };
}());
