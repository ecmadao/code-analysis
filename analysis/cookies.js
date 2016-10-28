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
   */
  if (typeof data === 'string') {
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
    var expired = typeof val === 'undefined' || (opt.nulltoremove && val === null);
    var str = opt.autojson ? JSON.stringify(val) : val;
    var encoded = opt.autoencode ? opt.encode(str) : str;
    if (expired) encoded = '';
    var res = opt.encode(key) + '=' + encoded +
      (opt.expires ? (';expires=' + expires(expired ? -10000 : opt.expires)) : '') +
      ';path=' + opt.path +
      (opt.domain ? (';domain=' + opt.domain) : '') +
      (opt.secure ? ';secure' : '');
    if (opt.test) opt.test(res);
    document.cookie = res;

    var read = (cookies(opt.encode(key)) || '');
    if (val && !expired && opt.expires > 0 &&
        JSON.stringify(read) !== JSON.stringify(val)) {
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
    module.exports = cookies;
  } else if (typeof define === 'function' && define.amd) {
    define('cookies', [], cookies);
  } else if (typeof exports === 'object') {
    exports['cookies'] = cookies;
  } else {
    root['cookies'] = cookies;
  }
})(this);
