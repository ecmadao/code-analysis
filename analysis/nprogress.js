/* NProgress, (c) 2013, 2014 Rico Sta. Cruz - http://ricostacruz.com/nprogress
 * @license MIT */

;(function(root, factory) {
  /*
   * 和 blazy 里一样的套路，值得学习
   * 检测包管理的类型 AMD/CommonJS/全局
   * 可见：
   * https://github.com/ecmadao/code-analysis/blob/master/analysis/blazy.js
   */
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.NProgress = factory();
  }

})(this, function() {
  var NProgress = {};

  NProgress.version = '0.2.0';

  var Settings = NProgress.settings = {
    minimum: 0.08,
    easing: 'linear',
    positionUsing: '',
    speed: 350,
    trickle: true,
    trickleSpeed: 250,
    showSpinner: true,
    // 定义 progress 的 DOM 选择器
    barSelector: '[role="bar"]',
    spinnerSelector: '[role="spinner"]',
    // progress 直接加载在 body 下
    parent: 'body',
    template: '<div class="bar" role="bar"><div class="peg"></div></div><div class="spinner" role="spinner"><div class="spinner-icon"></div></div>'
  };

  /*
   * 一个暴露的 API，用于更改 NProgress 默认的 Setting
   *
   * 使用例如
   * NProgress.configure({
   *  minimum: 0.1
   * });
   * 的方式进行调用
   */
  NProgress.configure = function(options) {
    var key, value;
    for (key in options) {
      value = options[key];
      if (value !== undefined && options.hasOwnProperty(key)) Settings[key] = value;
    }

    return this;
  };

  // 通过 status 来判断 progress 的状态。如果 status 是一个数字，则表示 progress 正在进行中
  NProgress.status = null;

  /**
   * 改变 progress 状态的 API，n 为数值，从 0.0 到 1.0
   * 当 n 为 1 时，则将 NProgress.status 标记为 null，证明已完成
   *
   * NProgress.set(0.4);
   * NProgress.set(1.0);
   */
  NProgress.set = function(n) {
    var started = NProgress.isStarted();

    // 确保 n 的大小合法
    n = clamp(n, Settings.minimum, 1);
    NProgress.status = (n === 1 ? null : n);

    var progress = NProgress.render(!started),
        bar      = progress.querySelector(Settings.barSelector),
        speed    = Settings.speed,
        ease     = Settings.easing;

    // 通过获取 offsetWidth 来使其进行重绘
    progress.offsetWidth;

    queue(function(next) {
      // 通过 NProgress.getPositioningCSS 方法获取到当前浏览器支持的 CSS 写法
      // 以便确定通过改变何种 CSS 属性，来达到进度条的效果
      if (Settings.positionUsing === '') Settings.positionUsing = NProgress.getPositioningCSS();

      // 增加 transition
      css(bar, barPositionCSS(n, speed, ease));

      if (n === 1) {
        // Fade out
        css(progress, {
          transition: 'none',
          opacity: 1
        });
        progress.offsetWidth; /* Repaint */

        setTimeout(function() {
          css(progress, {
            transition: 'all ' + speed + 'ms linear',
            opacity: 0
          });
          setTimeout(function() {
            NProgress.remove();
            next();
          }, speed);
        }, speed);
      } else {
        setTimeout(next, speed);
      }
    });

    return this;
  };

  /*
   * 通过 NProgress.status 进行状态判断
   * 当 NProgress.status 为数字时，则证明 progress 还在进行当中
   */
  NProgress.isStarted = function() {
    return typeof NProgress.status === 'number';
  };

  /*
   * 开始 progress 的API，也可以通过 NProgress.set(number) 直接开始
   * 如果之前没有 set，则通过 start 方法会赋予 0 作为初始值
   */
  NProgress.start = function() {
    if (!NProgress.status) NProgress.set(0);

    /*
     * 通过递归调用，作用类似于 setInterval
     * 以 NProgress.status 作为是否继续进行的判断
     * 以 Settings.trickle 作为能否可以开始的判断
     * 在 NProgress.trickle 方法中首先通过 NProgress.inc 获取随机的合法数值，
     * 之后通过 NProgress.set 进行 progressBar 的操作
     */
    var work = function() {
      setTimeout(function() {
        if (!NProgress.status) return;
        NProgress.trickle();
        work();
      }, Settings.trickleSpeed);
    };

    if (Settings.trickle) work();

    return this;
  };

  /*
   * 对外暴露的完成 progress 的 API，通过 NProgress.done() 进行调用
   * 如果 传入 true 参数，例如 NProgress.done(true)，则 progress 在完成之后也不会消失
   * 可以看到，在调用 NProgress.done 方法时，首先会通过 NProgress.inc 方法进行一个随机的进度增长，
   * 之后才通过 set(1) 将其完成
   */
  NProgress.done = function(force) {
    if (!force && !NProgress.status) return this;

    return NProgress.inc(0.3 + 0.5 * Math.random()).set(1);
  };

  /*
   * 获取一个随机的合法数值，作为 progress number 的增长值
   */
  NProgress.inc = function(amount) {
    var n = NProgress.status;

    if (!n) {
      return NProgress.start();
    } else if(n > 1) {
      return;
    } else {
      if (typeof amount !== 'number') {
        if (n >= 0 && n < 0.25) {
          // Start out between 3 - 6% increments
          amount = (Math.random() * (5 - 3 + 1) + 3) / 100;
        } else if (n >= 0.25 && n < 0.65) {
          // increment between 0 - 3%
          amount = (Math.random() * 3) / 100;
        } else if (n >= 0.65 && n < 0.9) {
          // increment between 0 - 2%
          amount = (Math.random() * 2) / 100;
        } else if (n >= 0.9 && n < 0.99) {
          // finally, increment it .5 %
          amount = 0.005;
        } else {
          // after 99%, don't increment:
          amount = 0;
        }
      }

      n = clamp(n + amount, 0, 0.994);
      return NProgress.set(n);
    }
  };

  /*
   * 获取一个随机数，并通过 NProgress.set 改变进度
   */
  NProgress.trickle = function() {
    return NProgress.inc();
  };

  /**
   * Waits for all supplied jQuery promises and
   * increases the progress as the promises resolve.
   *
   * @param $promise jQUery Promise
   */
  (function() {
    var initial = 0, current = 0;

    NProgress.promise = function($promise) {
      if (!$promise || $promise.state() === "resolved") {
        return this;
      }

      if (current === 0) {
        NProgress.start();
      }

      initial++;
      current++;

      $promise.always(function() {
        current--;
        if (current === 0) {
            initial = 0;
            NProgress.done();
        } else {
            NProgress.set((initial - current) / initial);
        }
      });

      return this;
    };

  })();

  /*
   * progress DOM 的构建方法
   * 会以 isRendered() 作为是否已经构建 DOM 的标识，是则通过选择器选择出 progress DOM 并返回，
   * 否则通过 Settings.template，向 Settings.parent 中插入 DOM
   * 最终返回的都是 progress DOM 元素
   */
  NProgress.render = function(fromStart) {
    // 通过 NProgress.isRendered() 标识确保一次只会渲染一个 nprogress DOM
    if (NProgress.isRendered()) return document.getElementById('nprogress');

    addClass(document.documentElement, 'nprogress-busy');

    var progress = document.createElement('div');
    progress.id = 'nprogress';
    progress.innerHTML = Settings.template;

    var bar      = progress.querySelector(Settings.barSelector),
        perc     = fromStart ? '-100' : toBarPerc(NProgress.status || 0),
        parent   = document.querySelector(Settings.parent),
        spinner;

    css(bar, {
      transition: 'all 0 linear',
      transform: 'translate3d(' + perc + '%,0,0)'
    });

    if (!Settings.showSpinner) {
      spinner = progress.querySelector(Settings.spinnerSelector);
      spinner && removeElement(spinner);
    }

    if (parent != document.body) {
      addClass(parent, 'nprogress-custom-parent');
    }

    parent.appendChild(progress);
    return progress;
  };

  /*
   * progress 的 remove 方法，从 DOM 中删除
   */
  NProgress.remove = function() {
    removeClass(document.documentElement, 'nprogress-busy');
    removeClass(document.querySelector(Settings.parent), 'nprogress-custom-parent');
    var progress = document.getElementById('nprogress');
    progress && removeElement(progress);
  };

  /*
   * 通过 getElementById 检查 HTML 中是否已存在 progress DOM
   */
  NProgress.isRendered = function() {
    return !!document.getElementById('nprogress');
  };

  /*
   * 获取可行的 CSS 规则
   * 通过判断浏览器支持的兼容性写法，最终返回
   * translate3d、translate 或 margin
   */
  NProgress.getPositioningCSS = function() {
    // Sniff on document.body.style
    var bodyStyle = document.body.style;

    // 通过这个判断，来获取浏览器所支持的兼容性写法
    var vendorPrefix = ('WebkitTransform' in bodyStyle) ? 'Webkit' :
                       ('MozTransform' in bodyStyle) ? 'Moz' :
                       ('msTransform' in bodyStyle) ? 'ms' :
                       ('OTransform' in bodyStyle) ? 'O' : '';

    if (vendorPrefix + 'Perspective' in bodyStyle) {
      // 如果 document.body.style 中存在 vendorPrefix + 'Perspective'，则
      // 可以认为是现代浏览器，支持 3D 属性（例如 Webkit, IE10），因此可以使用 translate3d
      return 'translate3d';
    } else if (vendorPrefix + 'Transform' in bodyStyle) {
      // 对于没有 translate3d 支持，但支持 Transform 的浏览器（例如 IE9）
      // 则使用 translate
      return 'translate';
    } else {
      // 否则只能使用 margin 的方法（例如 IE7-8）
      return 'margin';
    }
  };

  /*
   * 辅助方法，确保数值 n 不会高于最大值，不会低于最小值
   */
  function clamp(n, min, max) {
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  /**
   * 将 (0..1) 转换为 (-100%..0%) 以供 translateX 使用
   */
  function toBarPerc(n) {
    return (-1 + n) * 100;
  }

  /*
   * 利用 Settings.positionUsing 进行判断，使用不同方法改变 progress 的CSS
   */
  function barPositionCSS(n, speed, ease) {
    var barCSS;

    if (Settings.positionUsing === 'translate3d') {
      barCSS = { transform: 'translate3d('+toBarPerc(n)+'%,0,0)' };
    } else if (Settings.positionUsing === 'translate') {
      barCSS = { transform: 'translate('+toBarPerc(n)+'%,0)' };
    } else {
      barCSS = { 'margin-left': toBarPerc(n)+'%' };
    }

    barCSS.transition = 'all '+speed+'ms '+ease;

    return barCSS;
  }

  /*
   * queue 是一个自调用函数，最终真正返回一个 function
   * 它接收一个 func 作为参数，将其插入到队列当中，然后从队列里取出后执行。
   * 确保了每次只会执行一个 func
   */
  var queue = (function() {
    var pending = [];

    function next() {
      var fn = pending.shift();
      if (fn) {
        fn(next);
      }
    }

    return function(fn) {
      pending.push(fn);
      if (pending.length == 1) next();
    };
  })();

  /**
   * (Internal) Applies css properties to an element, similar to the jQuery
   * css method.
   *
   * While this helper does assist with vendor prefixed property names, it
   * does not perform any manipulation of values prior to setting styles.
   */
  /*
   * 类似于 jQuery 的 css() 函数
   */
  var css = (function() {
    var cssPrefixes = [ 'Webkit', 'O', 'Moz', 'ms' ],
        cssProps    = {};

    /*
     * 针对兼容行写法的 CSS进行转换
     * 将 -ms-xxx 转换为 msXxx
     * 将 -webkit-xxx 转换为 WebkitXxx
     * 将 -o-xxx 转换为 OXxx
     * 将 -moz-xxx 转换为 MozXxx
     * xxx 依旧是 xxx
     */
    function camelCase(string) {
      return string.replace(/^-ms-/, 'ms-').replace(/-([\da-z])/gi, function(match, letter) {
        return letter.toUpperCase();
      });
    }

    /*
     * 通过 camelCase 方法，可以将有兼容性写法的 CSS 进行首字母大写转换，但普通 CSS 则没有作用
     * 而 getVendorProp 作用在于获取普通 CSS 的兼容性支持（按照 cssPrefixes 里的预设），
     * 并进行首字母大写转换
     */
    function getVendorProp(name) {
      var style = document.body.style;
      if (name in style) return name;

      var i = cssPrefixes.length,
          // 将 CSS 名称进行首字母大写转换
          capName = name.charAt(0).toUpperCase() + name.slice(1),
          vendorName;
      while (i--) {
        // 检查存在的 CSS 写法并将其返回
        vendorName = cssPrefixes[i] + capName;
        if (vendorName in style) return vendorName;
      }

      return name;
    }

    /*
     * 获取 css 兼容性写法，
     * 若没有则通过 getVendorProp 获取，并赋予进 cssProps obj
     */
    function getStyleProp(name) {
      name = camelCase(name);
      return cssProps[name] || (cssProps[name] = getVendorProp(name));
    }

    /*
     * 将正确的 CSS 赋予 element
     */
    function applyCss(element, prop, value) {
      prop = getStyleProp(prop);
      element.style[prop] = value;
    }

    /*
     * 接受 (DOM, 属性组成的obj)
     * 也接受 (DOM, key, value) 的形式
     */
    return function(element, properties) {
      var args = arguments,
          prop,
          value;

      if (args.length == 2) {
        // loop 获取 properties 中的合法属性，依次对 element 进行属性改变
        for (prop in properties) {
          value = properties[prop];
          if (value !== undefined && properties.hasOwnProperty(prop)) applyCss(element, prop, value);
        }
      } else {
        applyCss(element, args[1], args[2]);
      }
    }
  })();

  /*
   * 仿造 jQuery API
   * hasClass
   * addClass
   * removeClass
   */

  /*
   * element 应该是已经经过 classList 格式化返回的 String，否则就通过 classList 进行格式化
   * 使用 indexOf 进行判断
   */
  function hasClass(element, name) {
    var list = typeof element == 'string' ? element : classList(element);
    return list.indexOf(' ' + name + ' ') >= 0;
  }

  /*
   * 新增 className 的 func
   * 通过 hasClass 检查是否已存在
   * 若否，则在 String 类型的 className 后面新增 class，并去除空格
   */
  function addClass(element, name) {
    var oldList = classList(element),
        newList = oldList + name;

    if (hasClass(oldList, name)) return;

    // 去除开头的空格
    element.className = newList.substring(1);
  }

  /*
   * 移除 className 的 func
   */
  function removeClass(element, name) {
    var oldList = classList(element),
        newList;

    if (!hasClass(element, name)) return;

    // 将 ' className ' 替换为 ' ' 以达到删除效果
    newList = oldList.replace(' ' + name + ' ', ' ');

    // 去除开头和结尾的空格
    element.className = newList.substring(1, newList.length - 1);
  }

  /*
   * 返回一个由 className 组成的 String，不同 className 之间使用空格分隔
   * {className: 'main_wrapper'} 返回 ' main_wrapper '
   * {className: 'main_wrapper test'} 返回 ' main_wrapper test '
   * 注：返回结果在不同 className 之间使用空格连接，且 String 的开头和结尾都有空格
   */
  function classList(element) {
    return (' ' + (element && element.className || '') + ' ').replace(/\s+/gi, ' ');
  }

  /*
   * 从 parentNode 中删除目标 DOM
   */
  function removeElement(element) {
    element && element.parentNode && element.parentNode.removeChild(element);
  }

  return NProgress;
});
