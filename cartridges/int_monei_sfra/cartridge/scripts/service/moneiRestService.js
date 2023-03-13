'use strict';

const serviceName = 'int_monei.http.rest';

var { createErrorLog, getUrlPath } = require('../monei/moneiUtils');

/** createRequest callback for a service
 * @param  {dw.svc.Service} service service instance
 * @param  {Object} data call data with path, method, body for a call or createToken in case of recursive call
 * @returns {string} request body
 */
function createRequest(service, data) {
    var credential = service.configuration.credential;
    var ServiceCredential = require('dw/svc/ServiceCredential');
    if (!(credential instanceof ServiceCredential)) {
        var { msgf } = require('dw/web/Resource');
        throw new Error(msgf('service.nocredentials', 'moneierrors', null, serviceName));
    }
    var { path, method, body} = data;

    service.setURL(getUrlPath(credential.URL, path));
    service.addHeader('Content-Type', 'application/json');
    service.setRequestMethod(method || 'POST');
    service.addHeader('Authorization', credential.password);
    return body ? JSON.stringify(body) : '';
}



module.exports = (function () {
    const { msgf } = require('dw/web/Resource');
    var restService;
    try {
        restService = require('dw/svc/LocalServiceRegistry').createService(serviceName, {
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
        createErrorLog(msgf('service.error', 'moneierrors', null, serviceName));
        throw new Error();
    }

    return {
        call: function (data) {
            var result;
            try {
                result = restService.setThrowOnError().call(data);
            } catch (error) {
                createErrorLog(msgf('service.generalerror', 'moneierrors', null, serviceName));
                throw new Error();
            }
            if (result.isOk()) {
                return restService.response;
            }
            if (!result.message) {
                createErrorLog(msgf('service.wrongendpoint', 'moneierrors', null, data.path));
                throw new Error();
            }

            var errorMessage;
            var errorData = JSON.parse(result.message);
            // For type error ex -> {"error", "error_description"}
            if (errorData) {
                errorMessage = errorData;
            } 

            throw new Error(errorMessage.toLowerCase());
        }
    };
}());
