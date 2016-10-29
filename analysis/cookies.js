var cookies = function (data, opt) {
  /*
   * 合并对象
   * 功能类似于 Object.assign(obj, defs)
   */
  function defaults (obj, defs) {
    obj = obj || {};
    for (var key in defs) {
      if (obj[key] === undefined) {
        obj[key] = defs[key];
      }
    }
    return obj;
  }

  // 构造一个 cookies 对象
  defaults(cookies, {
    expires: 365 * 24 * 3600,
    path: '/',
    secure: window.location.protocol === 'https:',

    // Advanced
    nulltoremove: true,
    autojson: true,
    autoencode: true,
    encode: function (val) {
      // encodeURIComponent() 函数可把字符串作为 URI 组件进行编码
      return encodeURIComponent(val);
    },
    decode: function (val) {
      // decodeURIComponent() 函数可对 encodeURIComponent() 函数编码的 URI 进行解码
      return decodeURIComponent(val);
    },
    error: function (error, data, opt) {
      throw new Error(error);
    },
    fallback: false
  });

  opt = defaults(opt, cookies);

  /*
   * 设置过期时间
   * 如果参数是一个 Date 对象，则直接返回 toUTCString()
   * 否则新建一个 Date 对象
   */
  function expires (time) {
    var expires = time;
    if (!(expires instanceof Date)) {
      expires = new Date();
      expires.setTime(expires.getTime() + (time * 1000));
    }
    return expires.toUTCString();
  }

  /*
   * 如果 data 是 String 类型，则是一个 get cookie 操作
   * 否则是一个 Object，认为是 set 操作
   * 而 set 操作则会遍历 Object 中的每一个 value，通过 JSON.stringify 和 opt.encode 转换
   * 如果过期（expired），则将 value 设置为空
   */
  if (typeof data === 'string') {
    /*
     * {key: 'test'} 的对象，会储存为
     * "key=test;expires=Sun, 29 Oct 2017 02:37:58 GMT;path=/"
     * 则
     * document.cookie.split(/;\s/) -> ["key=test", "expires=Sun, 29 Oct 2017 02:37:58 GMT", "path=/"]
     * .map(opt.autoencode) -> ["key=test", "expires=Sun, 29 Oct 2017 02:37:58 GMT", "path=/"]
     * .map(function (part) { return part.split('='); }) ->
     * [["key", "test"], ["expires", "Sun, 29 Oct 2017 02:37:58 GMT"], ["path", "/"]]
     * .reduce ->
     * {
     *    expires: "Sun, 29 Oct 2017 02:37:58 GMT",
     *    key: "test",
     *    path: "/"
     * }
     */
    var value = document.cookie.split(/;\s*/)
      .map(opt.autoencode ? opt.decode : function (d) { return d; })
      .map(function (part) { return part.split('='); })
      .reduce(function (parts, part) {
        parts[part[0]] = part[1];
        return parts;
      }, {})[data];
    if (!opt.autojson) return value;
    var real;
    try {
      real = JSON.parse(value);
    } catch (e) {
      real = value;
    }
    if (typeof real === 'undefined' && opt.fallback) real = opt.fallback(data, opt);
    return real;
  }

  // Set each of the cookies
  for (var key in data) {
    var val = data[key];
    // 对于不合法的值标记为过期。若过期，则过期时间为 -10000，否则使用默认的过期时间 opt.expires
    var expired = typeof val === 'undefined' || (opt.nulltoremove && val === null);
    var str = opt.autojson ? JSON.stringify(val) : val;
    var encoded = opt.autoencode ? opt.encode(str) : str;
    if (expired) encoded = '';
    /*
     * 一个形如 {key: 'test'} 的对象，会储存为
     * "key=test;expires=Sun, 29 Oct 2017 02:37:58 GMT;path=/"
     */
    var res = opt.encode(key) + '=' + encoded +
      (opt.expires ? (';expires=' + expires(expired ? -10000 : opt.expires)) : '') +
      ';path=' + opt.path +
      (opt.domain ? (';domain=' + opt.domain) : '') +
      (opt.secure ? ';secure' : '');
    if (opt.test) opt.test(res);
    document.cookie = res;

    var read = (cookies(opt.encode(key)) || '');
    if (val && !expired && opt.expires > 0 &&
        // 针对没有储存成功的情况
        JSON.stringify(read) !== JSON.stringify(val)) {

      /*
       * navigator.cookieEnabled，返回一个布尔值
       * 表明当前页面是否启用了cookies(只读属性)
       */
      if (navigator.cookieEnabled) {
        if (opt.fallback) {
          opt.fallback(data, opt);
        } else {
          opt.error('Cookie too large at ' + val.length + ' characters');
        }
      } else {
        opt.error('Cookies not enabled');
      }
    }
  }
  return cookies;
};

(function webpackUniversalModuleDefinition (root) {
  if (typeof exports === 'object' && typeof module === 'object') {
    // CommonJS
    module.exports = cookies;
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define('cookies', [], cookies);
  } else if (typeof exports === 'object') {
    // node.js
    exports['cookies'] = cookies;
  } else {
    // global
    root['cookies'] = cookies;
  }
})(this);
