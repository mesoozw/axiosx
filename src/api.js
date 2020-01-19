import axios from 'axios'
import utils from 'axios/lib/utils'


function warn (message) {
  if (typeof console !== undefined) {
    console.warn(message)
  }
}

// 请求传参的优先于axios配置的选项,
// rebuildURL,dataValidate,success,fail,error,complete,dataFilter
function buildCallback (name, config, defaults) {
  return function wrap (arg, ...args) {
    let fn = config[name] || defaults[name]
    if (utils.isFunction(fn)) {
      return fn(arg, ...args)
    }
    return arg
  }
}

function buildCallbacks (config, axiosInstance) {
  let defaults = axiosInstance.defaults
  let cbs = {}
  let cbNames = ['rebuildURL', 'dataValidate', 'success', 'fail', 'error', 'complete', 'dataFilter']
  utils.forEach(cbNames, fnName => {
    cbs[fnName] = buildCallback(fnName, config, defaults)
  })
  return cbs
}


function buildModule (parent, key) {
  let module = parent[key]
  if (module === undefined) {
    module = Object.create(null)
  } else if (!(utils.isObject(module) || utils.isFunction(module))) {
    let o = Object.create(null)
    o._$default = module
    module = o
  }
  return module
}

function bindBuildFnAwait (url) {
  let context = this
  let _$axios = context._$axios
  function buildRequestFnAwait (config) {
    config = config || {}
    let rebuildURL = buildCallback('rebuildURL', config, _$axios.defaults)
    context._$interceptController.handleRegisterType(config)
    config.url = config.url || rebuildURL(url, config)
    return _$axios(config)
  }
  
  return buildRequestFnAwait
}

function bindBuildFn (url) {
  let context = this
  let _$axios = context._$axios
  function buildRequestFn (config) {
    config = config || {}
    let $api = context
    let view = config.view || context.getCurrentView()
    let { rebuildURL, validateData, success, fail, error, complete, dataFilter } = buildCallbacks(config, _$axios)
    context._$interceptController.handleRegisterType(config)
    config.url = config.url || rebuildURL(url, config)
    return _$axios(config).then(function (response) {
      let data = dataFilter(response.data, response, view, $api, config)
      let params = { data, response, view, $api, config }
      if (validateData(params)) {
        success(params)
      } else {
        fail(params)
      }
      complete(params)
      return response
    }).catch(function (err) {
      error({ err, view, $api, config })
      complete({ err, view, $api, config })
      return Promise.reject(reason);
    })
  }
  
  return buildRequestFn
}

function parseNamePath (name, delimiter) {
  delimiter = delimiter || '\\$'
  name += ''
  let regSpace = /\s+/g
  let regTrimHeadDelimiter = new RegExp(`^(${delimiter})+`, 'g')
  let regTrimTrailDelimiter = new RegExp(`(${delimiter})+$`, 'g')
  let regTrimDelimiterTrail_ = new RegExp(`(${delimiter})_+`, 'g')
  let regTrimDelimiterHead_ = new RegExp(`_+(${delimiter})`, 'g')
  let rregNamePath = RegExp(`(${delimiter})+`, 'g')
  let regNamePath = RegExp(`${delimiter}`)
  let regNameMap = new RegExp(`${delimiter}|_`)
  let namePaths = name
  namePaths = namePaths.replace(regSpace, '').
    replace(regTrimHeadDelimiter, '').
    replace(regTrimTrailDelimiter, '').
    replace(rregNamePath, '$1').
    replace(regTrimDelimiterTrail_, '$1').
    replace(regTrimDelimiterHead_, '$1')
  if (regNameMap.test(namePaths)) {
    namePaths = namePaths.toLowerCase().replace(/_+([a-z])/g, function (r, c) {
      return c.toUpperCase()
    })
  }
  namePaths = namePaths.split(regNamePath)
  return namePaths
}

function eachURLs (urls, root, delimiter, buildFnFactory, buildFnAwaitFactory) {
  utils.forEach(urls, (url, name) => {
    let namePaths = parseNamePath(name, delimiter)
    let lastIndex = namePaths.length - 1
    namePaths.reduce((acc, cur, index) => {
      if (index === lastIndex) {
        if (utils.isObject(url)) {
          acc[cur] = buildModule(acc, cur)
          eachURLs(url, acc[cur], delimiter, buildFnFactory, buildFnAwaitFactory)
        } else {
          acc[cur] = buildFnFactory(url)
          acc[`${cur}Await`] = buildFnAwaitFactory(url)
        }
      } else {
        acc[cur] = buildModule(acc, cur)
        acc = acc[cur]
      }
      return acc
    }, root)
  })
}

class InterceptController {
  constructor (axiosInstance, interceptorConfig) {
    this.axiosInstance = axiosInstance
    this.nameIndexMap = {
      request: {},
      response: {}
    }
    this.handleRegisterType(interceptorConfig)
  }

  registerInterceptor (name, interceptor, type) {
    let fulfilled, rejected
    if (Array.isArray(interceptor)) {
      fulfilled = interceptor[0]
      rejected = interceptor[1]
    } else if (utils.isObject(interceptor)) {
      fulfilled = interceptor.fulfilled
      rejected = interceptor.rejected
    }
    if (!this.checkType(type)) {
      warn('interceptor type must be request or response')
      return
    }
    let index = this.axiosInstance.interceptors[type].use(fulfilled, rejected)
    this.mapNameIndex(name, index, type)
  }

  checkType (type) {
    return (type === 'request' || type === 'response')
  }

  mapNameIndex (name, index, type) {
    if (!this.checkType(type)) {
      warn('interceptor type must be request or response')
      return
    }
    this.nameIndexMap[type][name] = index
  }

  registerInterceptors (interceptors, type) {
    utils.forEach(interceptors, (interceptor, name) => {
      this.registerInterceptor(name, interceptor, type)
    })
  }

  handleRegisterType (options) {
    if (options.requestInterceptors) {
      this.registerInterceptors(options.requestInterceptors, 'request')
    }
    if (options.responseInterceptors) {
      this.registerInterceptors(options.responseInterceptors, 'response')
    }
  }

  ejectRequestInterceptor (name) {
    this.ejectInterceptor(name, 'request')
  }

  ejectResponseInterceptor (name) {
    this.ejectInterceptor(name, 'response')
  }

  ejectInterceptor (name, type) {
    if (!this.checkType(type)) {
      this.ejectRequestInterceptor(name)
      this.ejectResponseInterceptor(name)
      return
    }
    let id = this.nameIndexMap[type][name]
    if (id !== undefined) {
      this.axiosInstance.interceptors[type].eject(id)
      delete this.nameIndexMap[type][name]
    }
  }

  ejectRequestInterceptors (names) {
    if (names) {
      if (!Array.isArray(names)) {
        names = [names]
      }
      utils.forEach(names, name => {
        this.ejectRequestInterceptor(name)
      })
    } else {
      let interceptors = this.nameIndexMap['request']
      utils.forEach(interceptors, (id, name) => {
        this.ejectRequestInterceptor(name)
      })
    }
  }

  ejectResponseInterceptors (names) {
    if (names) {
      if (!Array.isArray(names)) {
        names = [names]
      }
      utils.forEach(names, name => {
        this.ejectResponseInterceptor(name)
      })
    } else {
      let interceptors = this.nameIndexMap['response']
      utils.forEach(interceptors, (id, name) => {
        this.ejectResponseInterceptor(name)
      })
    }
  }

  ejectInterceptors (names, type) {
    if (type === 'request') {
      this.ejectRequestInterceptors(names)
    } else if (type === 'response') {
      this.ejectResponseInterceptors(names)
    } else {
      this.ejectRequestInterceptors(names)
      this.ejectResponseInterceptors(names)
    }
  }
}
export default class API {
  constructor (options, apiInstance) {
    this._$options = utils.isObject(options) ? options : {}
    this.initAxiosUserConfigs(apiInstance)
    this.addUserMethods(this._$options['urls'], this._$options['delimiter'])
  }
  initAxiosUserConfigs (apiInstance) {
    let axiosConfig = this._$options['axiosConfig'] || {}
    if (apiInstance instanceof API) {
      this._$axios = apiInstance._$axios
      this._$interceptController = apiInstance._$interceptController
    } else {
      this._$axios = axios.create(axiosConfig)
      this._$interceptController = new InterceptController(this._$axios, axiosConfig)
    }
  }
  createWithMonoAxios () {
    return new API(this._$options, this)
  }
  addUserMethods (urls, delimiter) {
    if (!utils.isObject(urls)) return
    let buildFnFactory = bindBuildFn.bind(this)
    let buildFnAwaitFactory = bindBuildFnAwait.bind(this)
    eachURLs(urls, this, delimiter, buildFnFactory, buildFnAwaitFactory)
  }
  getImportAxios () {
    return axios
  }
  getCurrentView () {
    return this._$view
  }
}
