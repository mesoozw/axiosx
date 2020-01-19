# axiosx

## Installing

Using npm:

```bash
$ npm install axiosx
```


## Example
 目录
 ```
  api
   |- index.js  入口文件
   |- app.js    应用级共用接口文件
   |axios.config.js
   |-modules    模块目录
      |- moduleA.js
      |- user.js
  项目不大也可以统一放到一个constant.js的文件    
    api        
     |-constant.js
     |axios.config.js
```    

文件内容可以是对象，也可以是常量如下：
```
 index.js
    import * as commons from './app'
    import user from './modules/user'
    
    let urls = {
      ...commons,
      user
    }
    
    export default urls
 app.js 
   export const GET_HOME = '/api/website/home/get'
   export const GETUSERName = 'api/user/getName'
   export const GET_USER_ADRESS = 'api/user/getAdress'
   export const foo$_GET_USER_School = 'api/user/getSchool'
   export const FOO$BAR$GET__USER_Name = '/api/8feet/about/get' 
 /moduels/user.js
  export default {
    'GET_USER_NAME': '/api/name',
    'getUserAge': '/api/age',
    'FOO$getUserAge': '/api/age'
  }  
```
##axiosx API
 上面转换后的对象格式如下：
 ```
  {
    getHome(){},
    getHomeAwait(){},
    GETUSERName(){},
    GETUSERNameAwait(){},
    getUserAdress(){},
    getUserAdressAwait(){},
    foo:{
      getUserSchool () {}
      getUserSchoolAwait () {}
      bar: {
        getUserName (){}
        getUserNameAwait (){}
      }
    },
    user: {
      getUserName (){},
      getUserNameAwait (){},
      getUserAge (){},
      getUserAgeAwait (){},
      foo: {
       getUserAge (){}
       getUserAgeAwait (){}
      }
    }
  }
 $ module delimiter 为模块的默认分隔符，可以配置；_ method name delimiter为方法分隔符
 ```
## axois config
```
 axios.config.js是axios配置文件，支持axios上的所有配置选项
 这里的配置axios选项，将覆盖axios的默认设置；也会被方法中配置选项覆盖
 具体可参阅: axios(https://github.com/axios/axios/)，
 选项如下：
 {
   // `url` is the server URL that will be used for the request
   url: '/user',
 
   // `method` is the request method to be used when making the request
   method: 'get', // default
  ........
   // 如下是扩展：
    requestInterceptors: { //请求拦截器
      name: {fulfilled, rejected},
      name1: [fulfilled, rejected]
    },
    responseInterceptors:{ // 响应拦截器
      name: {fulfilled, rejected},
      name1: [fulfilled, rejected]
    }，
    rebuildURL:function（url, config）{return url}, // 在请求拦截器，发送请求前对url重新处理
    validateData:function({ // 响应请求成功后，对数据合法性检查
      data,
      response,
      view, // 当前组件
      $api,
      config
    }){//默认返回true
     return false | true
    },  
    success: function({ // 数据检查通过后调用的回调涵数
      data,
      response,
      view, // 当前组件
      $api,
       config
   }){}, 
  fail: function({ // 数据检查失败后调用的回调涵数
      data,
      response,
      view, // 当前组件
      $api,
      config
   }){},   
  error: function({ // 请求失败后调用的回调涵数
      error,
      view, // 当前组件
      $api,
       config
   }){},   
 complete: function({ // 请求成功或失败后，者会调用的回调涵数
      data, response | error,
      view, // 当前组件
      $api,
       config
   }){},    
  dataFilter: function({ // 请求成功后对数据进行处理
      data, 
      response,
      view, // 当前组件
      $api,
       config
   }){}   
 }
  
```
##用法
```
例如在vue中先注入：
  import Vue from 'vue'
  import App from './App.vue'
  import router from './router'
  import store from './store'
  
  import axiosx, {API} from './axiosx'
  import urls from './urls'
  import axiosConfig from './axios.config'
  
  Vue.use(axiosx)
  
  const api = new API({
    axiosConfig,
    urls
  })
  
  new Vue({
    router,
    store,
    api,
    render: h => h(App)
  }).$mount('#app')
```
##在方法中使用
```
vm.$api.getHome({
  method: 'post',
  data,
  success ({
    data,
    response,
    view, // 当前组件
    $api,
    config
  }){},
  error ({
    error,
    view, // 当前组件
    $api,
    config
  }){},
  complete({
   data,
   response,
   view, // 当前组件
   $api,
   config
  }){}
})

vm.$api.getHomeAwait().then(function (response) {
    // handle success
    console.log(response);
  })
  .catch(function (error) {
    // handle error
    console.log(error);
  })
  .finally(function () {
    // always executed
  })
  
  
// Want to use async/await? Add the `async` keyword to your outer function/method.
async function getUser() {
  try {
    const response = await vm.$api.getHomeAwait();
    console.log(response);
  } catch (error) {
    console.error(error);
  }
}  

如果使用了vuex，可以在actions中直接使：
store.$api.foo.getUserAge()
```


