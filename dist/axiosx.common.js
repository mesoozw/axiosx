/**
 * axiosx v1.0.0
 * (c) 20200 mesoo zw
 */
'use strict';

var Vue; // bind on install

function applyMixin(Vue) {
  var version = Number(Vue.version.split('.')[0]);
  if (version >= 2) {
    Vue.mixin({ beforeCreate: axiosxInit });
  } else {
    // override init and inject vapi init procedure for 1.x backwards compatibility.
    var _init = Vue.prototype._init;
    Vue.prototype._init = function (options = {}) {
      options.init = options.init
        ? [axiosxInit].concat(options.init)
        : axiosxInit;
      _init.call(this, options);
    }
  }
  
  // api init hook, injected into each instances init hooks list.
  function axiosxInit () {
    var options = this.$options;
    if (options.api) {
      this.$api = typeof options.api === 'function'
        ? options.api()
        : options.api;
    } else if (options.parent && options.parent.$api) {
      this.$api = options.parent.$api.createWithMonoAxios();
    }
    if (this.$api) {
      this.$api._$view = this;
      if (options.store) {
        options.store = typeof options.store === 'function'
          ? options.store()
          : options.store;
        options.store.$api = this.$api;
      }
    }
  }
};

function install (_Vue) {
  if (Vue && _Vue === Vue) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        '[vapi] already installed. Vue.use(vapi) should be called only once.'
      );
    }
    return;
  }
  Vue = _Vue;
  applyMixin(Vue);
};

var utils = {
  isObject: function (val) {
    return val !== null && typeof val === 'object';
  },
  isFunction: function (val) {
    return toString.call(val) === '[object Function]';
  },
  forEach: function (obj, fn) {
    // Don't bother if no value provided
    if (obj === null || typeof obj === 'undefined') {
      return;
    }
    
    // Force an array if not already something iterable
    if (typeof obj !== 'object') {
      /*eslint no-param-reassign:0*/
      obj = [obj];
    }
    
    if (isArray(obj)) {
      // Iterate over array values
      for (var i = 0, l = obj.length; i < l; i++) {
        fn.call(null, obj[i], i, obj);
      }
    } else {
      // Iterate over object keys
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          fn.call(null, obj[key], key, obj);
        }
      }
    }
  }
};



function warn (message) {
  if (typeof console !== undefined) {
    console.warn(message);
  }
};

// 请求传参的优先于axios配置的选项,
// rebuildURL,dataValidate,success,fail,error,complete,dataFilter
function buildCallback (name, config, defaults) {
  return function wrap (arg, ...args) {
    var fn = config[name] || defaults[name];
    if (utils.isFunction(fn)) {
      return fn(arg, ...args);
    }
    return arg;
  }
};

function buildCallbacks (config, axiosInstance) {
  var defaults = axiosInstance.defaults;
  var cbs = {};
  var cbNames = ['rebuildURL', 'dataValidate', 'success', 'fail', 'error', 'complete', 'dataFilter'];
  utils.forEach(cbNames, fnName => {
    cbs[fnName] = buildCallback(fnName, config, defaults);
  })
  return cbs;
};


function buildModule (parent, key) {
  var module = parent[key];
  if (module === undefined) {
    module = Object.create(null);
  } else if (!(utils.isObject(module) || utils.isFunction(module))) {
    var o = Object.create(null);
    o._$default = module;
    module = o;
  }
  return module;
};

function bindBuildFnAwait (url) {
  var context = this;
  var _$axios = context._$axios;
  function buildRequestFnAwait (config) {
    config = config || {};
    var rebuildURL = buildCallback('rebuildURL', config, _$axios.defaults);
    context._$interceptController.handleRegisterType(config);
    config.url = config.url || rebuildURL(url, config);
    return _$axios(config);
  }
  
  return buildRequestFnAwait;
};

function bindBuildFn (url) {
  var context = this;
  var _$axios = context._$axios;
  function buildRequestFn (config) {
    config = config || {};
    var $api = context;
    var view = config.view || context.getCurrentView();
    var { rebuildURL, validateData, success, fail, error, complete, dataFilter } = buildCallbacks(config, _$axios);
    context._$interceptController.handleRegisterType(config);
    config.url = config.url || rebuildURL(url, config);
    return _$axios(config).then(function (response) {
      var data = dataFilter(response.data, response, view, $api, config);
      var params = { data, response, view, $api, config };
      if (validateData(params)) {
        success(params);
      } else {
        fail(params);
      }
      complete(params);
      return response;
    }).catch(function (err) {
      error({ err, view, $api, config });
      complete({ err, view, $api, config });
      return Promise.reject(reason);
    })
  }
  
  return buildRequestFn;
};

function parseNamePath (name, delimiter) {
  delimiter = delimiter || '\\$';
  name += '';
  var regSpace = /\s+/g;
  var regTrimHeadDelimiter = new RegExp(`^(${delimiter})+`, 'g');
  var regTrimTrailDelimiter = new RegExp(`(${delimiter})+$`, 'g');
  var regTrimDelimiterTrail_ = new RegExp(`(${delimiter})_+`, 'g');
  var regTrimDelimiterHead_ = new RegExp(`_+(${delimiter})`, 'g');
  var rregNamePath = RegExp(`(${delimiter})+`, 'g');
  var regNamePath = RegExp(`${delimiter}`);
  var regNameMap = new RegExp(`${delimiter}|_`);
  var namePaths = name;
  namePaths = namePaths.replace(regSpace, '').
  replace(regTrimHeadDelimiter, '').
  replace(regTrimTrailDelimiter, '').
  replace(rregNamePath, '$1').
  replace(regTrimDelimiterTrail_, '$1').
  replace(regTrimDelimiterHead_, '$1');
  if (regNameMap.test(namePaths)) {
    namePaths = namePaths.toLowerCase().replace(/_+([a-z])/g, function (r, c) {
      return c.toUpperCase();
    })
  }
  namePaths = namePaths.split(regNamePath);
  return namePaths;
};

if (!Array.prototype.reduce) {
  Array.prototype.reduce = function(callback /*, initialValue*/) {
    if (this === null) {
      throw new TypeError( 'Array.prototype.reduce ' +
        'called on null or undefined' );
    }
    if (typeof callback !== 'function') {
      throw new TypeError( callback +
        ' is not a function');
    }
    
    // 1. Let O be ? ToObject(this value).
    var o = Object(this);
    
    // 2. Let len be ? ToLength(? Get(O, "length")).
    var len = o.length >>> 0;
    
    // Steps 3, 4, 5, 6, 7
    var k = 0;
    var value;
    
    if (arguments.length >= 2) {
      value = arguments[1];
    } else {
      while (k < len && !(k in o)) {
        k++;
      }
      
      // 3. If len is 0 and initialValue is not present,
      //    throw a TypeError exception.
      if (k >= len) {
        throw new TypeError( 'Reduce of empty array ' +
          'with no initial value' );
      }
      value = o[k++];
    }
    
    // 8. Repeat, while k < len
    while (k < len) {
      // a. Let Pk be ! ToString(k).
      // b. Let kPresent be ? HasProperty(O, Pk).
      // c. If kPresent is true, then
      //    i.  Let kValue be ? Get(O, Pk).
      //    ii. Let accumulator be ? Call(
      //          callbackfn, undefined,
      //          « accumulator, kValue, k, O »).
      if (k in o) {
        value = callback(value, o[k], k, o);
      }
      
      // d. Increase k by 1.
      k++;
    }
    
    // 9. Return accumulator.
    return value;
  }
};

function eachURLs (urls, root, delimiter, buildFnFactory, buildFnAwaitFactory) {
  utils.forEach(urls, (url, name) => {
    var namePaths = parseNamePath(name, delimiter);
    var lastIndex = namePaths.length - 1;
    namePaths.reduce((acc, cur, index) => {
      if (index === lastIndex) {
        if (utils.isObject(url)) {
          acc[cur] = buildModule(acc, cur);
          eachURLs(url, acc[cur], delimiter, buildFnFactory, buildFnAwaitFactory);
        } else {
          acc[cur] = buildFnFactory(url);
          acc[`${cur}Await`] = buildFnAwaitFactory(url);
        }
      } else {
        acc[cur] = buildModule(acc, cur);
        acc = acc[cur];
      }
      return acc;
    }, root);
  })
};

function InterceptController (axiosInstance, interceptorConfig) {
  this.axiosInstance = axiosInstance;
  this.nameIndexMap = {
    request: {},
    response: {}
  };
  this.handleRegisterType(interceptorConfig);
};

InterceptController.prototype.registerInterceptor = function registerInterceptor (name, interceptor, type) {
  var fulfilled, rejected;
  if (Array.isArray(interceptor)) {
    fulfilled = interceptor[0];
    rejected = interceptor[1];
  } else if (utils.isObject(interceptor)) {
    fulfilled = interceptor.fulfilled;
    rejected = interceptor.rejected;
  }
  if (!this.checkType(type)) {
    warn('interceptor type must be request or response');
    return;
  }
  var index = this.axiosInstance.interceptors[type].use(fulfilled, rejected);
  this.mapNameIndex(name, index, type);
};
InterceptController.prototype.handleRegisterType = function handleRegisterType (options) {
  if (options.requestInterceptors) {
    this.registerInterceptors(options.requestInterceptors, 'request');
  }
  if (options.responseInterceptors) {
    this.registerInterceptors(options.responseInterceptors, 'response');
  }
};
InterceptController.prototype.checkType = function checkType (type) {
  return (type === 'request' || type === 'response');
};
InterceptController.prototype.mapNameIndex = function mapNameIndex (name, index, type) {
  if (!this.checkType(type)) {
    warn('interceptor type must be request or response');
    return;
  }
  this.nameIndexMap[type][name] = index;
};
InterceptController.prototype.registerInterceptors = function registerInterceptors (interceptors, type) {
  utils.forEach(interceptors, (interceptor, name) => {
    this.registerInterceptor(name, interceptor, type);
  })
};
InterceptController.prototype.handleRegisterType = function handleRegisterType (options) {
  if (options.requestInterceptors) {
    this.registerInterceptors(options.requestInterceptors, 'request');
  }
  if (options.responseInterceptors) {
    this.registerInterceptors(options.responseInterceptors, 'response');
  }
};
InterceptController.prototype.ejectRequestInterceptor = function ejectRequestInterceptor (name) {
  this.ejectInterceptor(name, 'request');
};
InterceptController.prototype.ejectResponseInterceptor = function ejectResponseInterceptor (name) {
  this.ejectInterceptor(name, 'response');
};
InterceptController.prototype.ejectInterceptor = function ejectInterceptor (name, type) {
  if (!this.checkType(type)) {
    this.ejectRequestInterceptor(name);
    this.ejectResponseInterceptor(name);
    return;
  }
  var id = this.nameIndexMap[type][name]
  if (id !== undefined) {
    this.axiosInstance.interceptors[type].eject(id);
    delete this.nameIndexMap[type][name];
  }
};
InterceptController.prototype.ejectRequestInterceptors = function ejectRequestInterceptors (names) {
  if (names) {
    if (!Array.isArray(names)) {
      names = [names];
    }
    utils.forEach(names, name => {
      this.ejectRequestInterceptor(name);
    });
  } else {
    var interceptors = this.nameIndexMap['request']
    utils.forEach(interceptors, (id, name) => {
      this.ejectRequestInterceptor(name);
    });
  }
};
InterceptController.prototype.ejectResponseInterceptors = function ejectResponseInterceptors (names) {
  if (names) {
    if (!Array.isArray(names)) {
      names = [names];
    }
    utils.forEach(names, name => {
      this.ejectResponseInterceptor(name);
    });
  } else {
    var interceptors = this.nameIndexMap['response'];
    utils.forEach(interceptors, (id, name) => {
      this.ejectResponseInterceptor(name);
    });
  }
};
InterceptController.prototype.ejectInterceptors = function ejectInterceptors (names, type) {
  if (type === 'request') {
    this.ejectRequestInterceptors(names);
  } else if (type === 'response') {
    this.ejectResponseInterceptors(names);
  } else {
    this.ejectRequestInterceptors(names);
    this.ejectResponseInterceptors(names);
  }
};

function API (options, apiInstance) {
  this._$options = utils.isObject(options) ? options : {};
  this.initAxiosUserConfigs(apiInstance);
  this.addUserMethods(this._$options['urls'], this._$options['delimiter'])
};

API.prototype.initAxiosUserConfigs = function initAxiosUserConfigs (apiInstance) {
  var axiosConfig = this._$options['axiosConfig'] || {};
  if (apiInstance instanceof API) {
    this._$axios = apiInstance._$axios;
    this._$interceptController = apiInstance._$interceptController;
  } else {
    this._$axios = axios.create(axiosConfig);
    this._$interceptController = new InterceptController(this._$axios, axiosConfig);
  }
};
API.prototype.createWithMonoAxios = function  createWithMonoAxios () {
  return new API(this._$options, this);
};
API.prototype.addUserMethods = function addUserMethods (urls, delimiter) {
  if (!utils.isObject(urls)) return;
  var buildFnFactory = bindBuildFn.bind(this);
  var buildFnAwaitFactory = bindBuildFnAwait.bind(this);
  eachURLs(urls, this, delimiter, buildFnFactory, buildFnAwaitFactory);
};
API.prototype.getImportAxios = function getImportAxios () {
  return axios;
};
API.prototype.getCurrentView = function  getCurrentView () {
  return this._$view;
};

var axiosx = { API, install, version: '1.0.0' };


module.exports = axiosx;
