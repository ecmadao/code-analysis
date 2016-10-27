/*!
  blazy.js - v1.8.1
*/

// 加入;是为了防止js代码打包混淆后出错，即起到保护作用
;
(function(root, blazy) {
    if (typeof define === 'function' && define.amd) {
        // 通过 AMD 的模块管理方式进行暴露
        define(blazy);
    } else if (typeof exports === 'object') {
        // 如果存在 exports，则使用 module.exports 的 CommonJS 方式进行暴露
        module.exports = blazy();
    } else {
        // 否则的话就认为用户直接在HTML里引入了该文件，那么将bLazy作为全局方法导出
        root.Blazy = blazy();
    }
})(this, function() {
    'use strict';

    //private vars
    var _source, _viewport, _isRetina, _supportClosest, _attrSrc = 'src', _attrSrcset = 'srcset';

    // constructor
    return function Blazy(options) {
        // 针对IE7进行兼容 -- 没有 querySelectorAll 接口
        if (!document.querySelectorAll) {
            // createStyleSheet, IE特有方法，动态创建一个<style></style>节点
            var s = document.createStyleSheet();
            document.querySelectorAll = function(r, c, i, j, a) {
                /*
                 * 参数 r 是一个由逗号连接的包含一个或多个CSS选择器的字符串
                 * 例如，"div.note, div.alert"
                 * 而通过 replace(/\[for\b/gi, '[htmlFor').split(',') 方法之后，转换为合法的Array形式参数
                 * ["div.note", "div.alert"]
                 */
                a = document.all, c = [], r = r.replace(/\[for\b/gi, '[htmlFor').split(',');
                for (i = r.length; i--;) {
                    /*
                     * 通过 addRule 来在 <style></style> 中插入css
                     * 例如，addRule('div.example', 'k:v')，则在<style>中插入了 div.example {k:v}
                     * 通过这样的方式，在插入一个“k:v”之后遍历所有的 DOM（document.all），获取每个 DOM 的 currentStyle，检查是否存在 k，如果存在，则该 DOM就是被选择的 DOM
                     */
                    s.addRule(r[i], 'k:v');
                    for (j = a.length; j--;) a[j].currentStyle.k && c.push(a[j]);
                    s.removeRule(0);
                }
                return c;
            };
        }

        //options and helper vars
        var scope = this;
        var util = scope._util = {};
        util.elements = [];
        util.destroyed = true;
        scope.options = options || {};
        // 失败/成功的回调
        scope.options.error = scope.options.error || false;
        scope.options.success = scope.options.success || false;

        scope.options.offset = scope.options.offset || 100;
        scope.options.root = scope.options.root || document;
        scope.options.selector = scope.options.selector || '.b-lazy';
        scope.options.separator = scope.options.separator || '|';

        // options 中传入的 container 是一个 DOM 属性，譬如 class，在初始化时会根据这个参数以及 document.querySelectorAll 获取到所有需要懒加载的元素
        scope.options.containerClass = scope.options.container;
        scope.options.container = scope.options.containerClass ? document.querySelectorAll(scope.options.containerClass) : false;

        scope.options.errorClass = scope.options.errorClass || 'b-error';
        scope.options.successClass = scope.options.successClass || 'b-loaded';

        scope.options.breakpoints = scope.options.breakpoints || false;
        scope.options.loadInvisible = scope.options.loadInvisible || false;
        scope.options.validateDelay = scope.options.validateDelay || 25;
        scope.options.saveViewportOffsetDelay = scope.options.saveViewportOffsetDelay || 50;
        scope.options.srcset = scope.options.srcset || 'data-srcset';
        scope.options.src = _source = scope.options.src || 'data-src';
        _supportClosest = Element.prototype.closest;
        // 新姿势 get√
        _isRetina = window.devicePixelRatio > 1;

        _viewport = {};
        _viewport.top = 0 - scope.options.offset;
        _viewport.left = 0 - scope.options.offset;


        /* public functions
         ************************************/
        scope.revalidate = function() {
            initialize(this);
        };
        // 图片加载方法
        scope.load = function(elements, force) {
            var opt = this.options;
            if (elements.length === undefined) {
                loadElement(elements, force, opt);
            } else {
                // each 是一个辅助方法，对 elements 中的每一个元素代入到 func 中进行调用
                each(elements, function(element) {
                    loadElement(element, force, opt);
                });
            }
        };
        // 顾名思义，解绑时进行释放和清理
        scope.destroy = function() {
            var self = this;
            var util = self._util;
            if (self.options.container) {
                each(self.options.container, function(object) {
                    unbindEvent(object, 'scroll', util.validateT);
                });
            }
            unbindEvent(window, 'scroll', util.validateT);
            unbindEvent(window, 'resize', util.validateT);
            unbindEvent(window, 'resize', util.saveViewportOffsetT);
            util.count = 0;
            util.elements.length = 0;
            util.destroyed = true;
        };

        // throttle 是一个辅助类方法，用来确保方法不会被调用的过于频繁
        util.validateT = throttle(function() {
            validate(scope);
        }, scope.options.validateDelay, scope);
        util.saveViewportOffsetT = throttle(function() {
            saveViewportOffset(scope.options.offset);
        }, scope.options.saveViewportOffsetDelay, scope);
        // 改变 _viewport 里的 bottom 和 right
        saveViewportOffset(scope.options.offset);

        //handle multi-served image src (obsolete)
        each(scope.options.breakpoints, function(object) {
            if (object.width >= window.screen.width) {
                _source = object.src;
                return false;
            }
        });

        // start lazy load
        setTimeout(function() {
            initialize(scope);
        }); // "dom ready" fix

    };


    /* Private helper functions
     ************************************/
    function initialize(self) {
        var util = self._util;
        // 通过 toArray 方法获取到所以需要进行 lazyloading 的 DOM
        util.elements = toArray(self.options);
        util.count = util.elements.length;
        // 绑定 resize 和 scroll 的事件监听
        if (util.destroyed) {
            util.destroyed = false;
            if (self.options.container) {
                each(self.options.container, function(object) {
                    bindEvent(object, 'scroll', util.validateT);
                });
            }
            // resize 时触发的方法 saveViewportOffsetT 其作用其实就是调整偏移量
            // 之后通过 validateT 方法进行懒加载的触发
            bindEvent(window, 'resize', util.saveViewportOffsetT);
            bindEvent(window, 'resize', util.validateT);
            bindEvent(window, 'scroll', util.validateT);
        }
        // validate 方法才是真正进行懒加载的方法
        validate(self);
    }

    function validate(self) {
        var util = self._util;
        // 遍历所有元素，如果元素已处于视线中或者标记了 success 的 class 的话，则进行图片加载
        for (var i = 0; i < util.count; i++) {
            var element = util.elements[i];
            if (elementInView(element, self.options) || hasClass(element, self.options.successClass)) {
                self.load(element);
                util.elements.splice(i, 1);
                util.count--;
                i--;
            }
        }
        // 所有图片加载完毕之后，释放方法
        if (util.count === 0) {
            self.destroy();
        }
    }

    function elementInView(ele, options) {
        // getBoundingClientRect 用于获得页面中某个元素的左，上，右和下分别相对浏览器视窗的位置
        var rect = ele.getBoundingClientRect();

        if(options.container && _supportClosest){
            // 如果设置了 container，通过 closest 匹配且离当前元素(ele)最近的祖先(options.containerClass)元素
            var elementContainer = ele.closest(options.containerClass);
            if(elementContainer){
                var containerRect = elementContainer.getBoundingClientRect();
                // 如果 container 在视野内，那么还要判断 element 是否也在视野内
                if(inView(containerRect, _viewport)){
                    var containerRectWithOffset = {
                        top: containerRect.top - options.offset,
                        right: containerRect.right + options.offset,
                        bottom: containerRect.bottom + options.offset,
                        left: containerRect.left - options.offset
                    };
                    return inView(rect, containerRectWithOffset);
                } else {
                    return false;
                }
            }
        }
        return inView(rect, _viewport);
    }

    function inView(rect, viewport){
        // 看是否有交集
        return rect.right >= viewport.left &&
               rect.bottom >= viewport.top &&
               rect.left <= viewport.right &&
               rect.top <= viewport.bottom;
    }

    function loadElement(ele, force, options) {
        // if element is visible, not loaded or forced
        if (!hasClass(ele, options.successClass) && (force || options.loadInvisible || (ele.offsetWidth > 0 && ele.offsetHeight > 0))) {
            var dataSrc = getAttr(ele, _source) || getAttr(ele, options.src); // fallback to default 'data-src'
            if (dataSrc) {
                // 用户可以设置多个图片 url，以应对 retina 屏幕的情况。默认情况下使用 | 进行分隔，也可以自定义分隔符
                var dataSrcSplitted = dataSrc.split(options.separator);
                var src = dataSrcSplitted[_isRetina && dataSrcSplitted.length > 1 ? 1 : 0];
                var srcset = getAttr(ele, options.srcset);
                var isImage = equal(ele, 'img');
                var parent = ele.parentNode;
                var isPicture = parent && equal(parent, 'picture');
                // Image or background image
                if (isImage || ele.src === undefined) {
                    var img = new Image();
                    // 之所以使用事件监听的方式而不使用 onerror 和 onload 方法，则是因为 chrome v50 里的一个 bug：
                    // https://productforums.google.com/forum/#!topic/chrome/p51Lk7vnP2o
                    var onErrorHandler = function() {
                        if (options.error) options.error(ele, "invalid");
                        addClass(ele, options.errorClass);
                        unbindEvent(img, 'error', onErrorHandler);
                        unbindEvent(img, 'load', onLoadHandler);
                    };
                    var onLoadHandler = function() {
                        // Is element an image
                        if (isImage) {
                            if(!isPicture) {
                                handleSources(ele, src, srcset);
                            }
                        // or background-image
                        } else {
                            ele.style.backgroundImage = 'url("' + src + '")';
                        }
                        itemLoaded(ele, options);
                        unbindEvent(img, 'load', onLoadHandler);
                        unbindEvent(img, 'error', onErrorHandler);
                    };

                    // Picture element
                    if (isPicture) {
                        img = ele; // Image tag inside picture element wont get preloaded
                        each(parent.getElementsByTagName('source'), function(source) {
                            handleSource(source, _attrSrcset, options.srcset);
                        });
                    }
                    bindEvent(img, 'error', onErrorHandler);
                    bindEvent(img, 'load', onLoadHandler);
                    handleSources(img, src, srcset); // Preload

                } else { // An item with src like iframe, unity games, simpel video etc
                    ele.src = src;
                    itemLoaded(ele, options);
                }
            } else {
                // video with child source
                if (equal(ele, 'video')) {
                    each(ele.getElementsByTagName('source'), function(source) {
                        handleSource(source, _attrSrc, options.src);
                    });
                    ele.load();
                    itemLoaded(ele, options);
                } else {
                    if (options.error) options.error(ele, "missing");
                    addClass(ele, options.errorClass);
                }
            }
        }
    }

    // 加载完成之后进行收尾处理
    // 增加一个标记成功的 class，调用 success 回调，并删除不必要的属性
    function itemLoaded(ele, options) {
        addClass(ele, options.successClass);
        if (options.success) options.success(ele);
        removeAttr(ele, options.src);
        removeAttr(ele, options.srcset);
        each(options.breakpoints, function(object) {
            removeAttr(ele, object.src);
        });
    }

    // 通过设置 attr 来达到加载图片的效果
    function handleSource(ele, attr, dataAttr) {
        var dataSrc = getAttr(ele, dataAttr);
        if (dataSrc) {
            setAttr(ele, attr, dataSrc);
            removeAttr(ele, dataAttr);
        }
    }
    function handleSources(ele, src, srcset){
        if(srcset) {
            setAttr(ele, _attrSrcset, srcset); //srcset
        }
        ele.src = src; //src
    }

    // 制作一些类似于 jQuery API 的 func
    function setAttr(ele, attr, value){
        ele.setAttribute(attr, value);
    }
    function getAttr(ele, attr) {
        return ele.getAttribute(attr);
    }
    function removeAttr(ele, attr){
        ele.removeAttribute(attr);
    }
    function equal(ele, str) {
        return ele.nodeName.toLowerCase() === str;
    }
    function hasClass(ele, className) {
        return (' ' + ele.className + ' ').indexOf(' ' + className + ' ') !== -1;
    }
    function addClass(ele, className) {
        if (!hasClass(ele, className)) {
            ele.className += ' ' + className;
        }
    }

    // 获取 options 中 root 内部的所有 selector，并将其作为一个 Array 返回
    function toArray(options) {
        var array = [];
        var nodelist = (options.root).querySelectorAll(options.selector);
        for (var i = nodelist.length; i--; array.unshift(nodelist[i])) {}
        return array;
    }

    // 更新 _viewport 里记录的坐标范围
    function saveViewportOffset(offset) {
        _viewport.bottom = (window.innerHeight || document.documentElement.clientHeight) + offset;
        _viewport.right = (window.innerWidth || document.documentElement.clientWidth) + offset;
    }

    // 绑定/解绑事件
    function bindEvent(ele, type, fn) {
        if (ele.attachEvent) {
            ele.attachEvent && ele.attachEvent('on' + type, fn);
        } else {
            ele.addEventListener(type, fn, { capture: false, passive: true });
        }
    }
    function unbindEvent(ele, type, fn) {
        if (ele.detachEvent) {
            ele.detachEvent && ele.detachEvent('on' + type, fn);
        } else {
            ele.removeEventListener(type, fn, { capture: false, passive: true });
        }
    }

    // 通过 loop 将 object 中的每一个元素代入到 fn 方法里
    function each(object, fn) {
        if (object && fn) {
            var l = object.length;
            for (var i = 0; i < l && fn(object[i], i) !== false; i++) {}
        }
    }

    // 在限定时间内只能被调用一次，用来避免方法被过于频繁的调用
    function throttle(fn, minDelay, scope) {
        var lastCall = 0;
        return function() {
            var now = +new Date();
            if (now - lastCall < minDelay) {
                return;
            }
            lastCall = now;
            fn.apply(scope, arguments);
        };
    }
});
