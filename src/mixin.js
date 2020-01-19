export default function (Vue) {
  const version = Number(Vue.version.split('.')[0])
  if (version >= 2) {
    Vue.mixin({ beforeCreate: axiosxInit })
  } else {
    // override init and inject vapi init procedure for 1.x backwards compatibility.
    const _init = Vue.prototype._init
    Vue.prototype._init = function (options = {}) {
      options.init = options.init
        ? [axiosxInit].concat(options.init)
        : axiosxInit
      _init.call(this, options)
    }
  }

  // api init hook, injected into each instances init hooks list.
  function axiosxInit () {
    const options = this.$options
    if (options.api) {
      this.$api = typeof options.api === 'function'
        ? options.api()
        : options.api
    } else if (options.parent && options.parent.$api) {
      this.$api = options.parent.$api.createWithMonoAxios()
    }
    if (this.$api) {
      this.$api._$view = this
      if (options.store) {
        options.store = typeof options.store === 'function'
          ? options.store()
          : options.store
        options.store.$api = this.$api
      }
    }
  }
}
