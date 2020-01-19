import API from './api'
import applyMixin from './mixin'

let Vue // bind on install

function install (_Vue) {
  if (Vue && _Vue === Vue) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        '[vapi] already installed. Vue.use(vapi) should be called only once.'
      )
    }
    return
  }
  Vue = _Vue
  applyMixin(Vue)
}

let axiosx = { API, install, version: '1.0.0' }

export { API }
export default axiosx
