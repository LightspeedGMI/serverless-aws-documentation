'use strict';

const deref = require('json-schema-deref-sync');
//const console = require('console');

module.exports = {
  createCfModel: function createCfModel(model) {
    let derefschema = deref(model.schema || {}, {'failOnMissing':true, 'baseFolder':process.cwd()+'/schemas'})
    //console.log(JSON.stringify(derefschema, null, 2));
    //console.log(process.cwd()+"/schemas")
    return {
      Type: 'AWS::ApiGateway::Model',
      Properties: {
        RestApiId: {
          Ref: 'ApiGatewayRestApi',
        },
        ContentType: model.contentType,
        Name: model.name,
        Schema: derefschema,
      },
    };
  },

  addModelDependencies: function addModelDependencies(models, resource) {
    Object.keys(models).forEach(contentType => {
      resource.DependsOn.add(`${models[contentType]}Model`);
    });
  },

  addMethodResponses: function addMethodResponses(resource, documentation) {
    if (documentation.methodResponses) {
      if (!resource.Properties.MethodResponses) {
        resource.Properties.MethodResponses = [];
      }

      documentation.methodResponses.forEach(response => {
        let _response = resource.Properties.MethodResponses
          .find(originalResponse => originalResponse.StatusCode === response.statusCode);

        if (!_response) {
          _response = {
            StatusCode: response.statusCode,
          };

          if (response.responseHeaders) {
            const methodResponseHeaders = {};
            response.responseHeaders.forEach(header => {
              methodResponseHeaders[`method.response.header.${header.name}`] = true
            });
            _response.ResponseParameters = methodResponseHeaders;
          }

          resource.Properties.MethodResponses.push(_response);
        }

        if (response.responseModels) {
          _response.ResponseModels = response.responseModels;
          this.addModelDependencies(_response.ResponseModels, resource);
        }
      });
    }
  },

  addRequestModels: function addRequestModels(resource, documentation) {
    if (documentation.requestModels && Object.keys(documentation.requestModels).length > 0) {
      this.addModelDependencies(documentation.requestModels, resource);
      resource.Properties.RequestModels = documentation.requestModels;
    }
  }

};
