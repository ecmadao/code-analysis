/**
 * Push
 * =======
 * 一个跨浏览器的 JavaScript Notifications API
 */

(function (global, factory) {

    'use strict';

    /* Use AMD */
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return new (factory(global, global.document))();
        });
    }
    /* Use CommonJS */
    else if (typeof module !== 'undefined' && module.exports) {
        module.exports = new (factory(global, global.document))();
    }
    /* Use Browser */
    else {
        global.Push = new (factory(global, global.document))();
    }

})(typeof window !== 'undefined' ? window : this, function (w, d) {

    var Push = function () {

        /**********************
            Local Variables
        /**********************/

        var
        self = this,
        // 通过 helper 进行类型检查
        isUndefined   = function (obj) { return obj === undefined; },
        isString   = function (obj) { return String(obj) === obj },
        isFunction = function (obj) { return obj && {}.toString.call(obj) === '[object Function]'; },

        /* ID 用来分辨不同的 notification */
        currentId = 0,

        /* 当 Push Notifications 不被支持时的消息 */
        incompatibilityErrorMessage = 'PushError: push.js is incompatible with browser.',

        /* 是否有展示消息通知的权限 */
        hasPermission = false,

        /* 用于储存所有的 notification */
        notifications = {},

        /* Testing variable for the last service worker path used */
        lastWorkerPath = null,

        /**********************
            Helper Functions
        /**********************/

        /**
         * 关闭 notification
         * @param 接受 notification ID 作为参数
         * @return 返回 boolean，代表 notification 是否被成功关闭
         */
        closeNotification = function (id) {
            var errored = false,
                notification = notifications[id];

            if (typeof notification !== 'undefined') {
                /* Safari 6+, Chrome 23+ */
                if (notification.close) {
                    notification.close();
                /* Legacy webkit browsers */
                } else if (notification.cancel) {
                    notification.cancel();
                /* IE9+ */
                } else if (w.external && w.external.msIsSiteMode) {
                    w.external.msSiteModeClearIconOverlay();
                } else {
                    errored = true;
                    throw new Error('Unable to close notification: unknown interface');
                }

                if (!errored) {
                    return removeNotification(id);
                }
            }

            return false;
        },

        /**
         * 新增 notification，将 notification 增加进 notifications Object 中，递增现有 ID
         * @param notification 对象
         * @return 返回 notification ID，类型为 Int
         */
        addNotification = function (notification) {
            var id = currentId;
            notifications[id] = notification;
            currentId++;
            return id;
        },

        /**
         * 通过 notification ID 来删除 notification
         * @param  notification ID
         * @return Boolean 值，代表 notification 是否成功删除
         * 遍历 notifications 对象，通过 ID 删选出不需要删除的 notification，放入到新的 dict 对象里，
         * 以此达到删除特定 notification 的效果
         */
        removeNotification = function (id) {
            var dict = {},
                success = false,
                key;
            for (key in notifications) {
                if (notifications.hasOwnProperty(key)) {
                    if (key != id) {
                        dict[key] = notifications[key];
                    } else {
                        // 如果不存在要删除的 ID 则 success 最终为 false
                        success = true;
                    }
                }
            }
            notifications = dict;
            return success;
        },

        /**
         * 新建 notification 之后的回调
         * @return {void}
         */
        createCallback = function (title, options) {
            var notification,
                wrapper,
                id,
                onClose;

            options = options || {};

            // sw.js 是一个空的 js 文件
            /* Set the last service worker path for testing */
            self.lastWorkerPath = options.serviceWorker || 'sw.js';

            /* 处理 onClose 事件 */
            onClose = function () {
                removeNotification(id);
                if (isFunction(options.onClose)) {
                    options.onClose.call(this);
                }
            };

            if (w.Notification) {
              /*
               * Safari 6+, Firefox 22+, Chrome 22+, Opera 25+ 支持的 window.Notification API
               * 通过 new window.Notification(title, options) 新建一个 Notification 实例
               *
               * options:
               *  {
               *    dir: 通知的文本显示方向
               *    lang: 通知的语言
               *    body: 通知的文本内容
               *    tag: 通知的 ID
               *    icon: 通知的图标图片的 URL 地址
               *  }
               */
                try {
                    notification =  new w.Notification(
                        title,
                        {
                            icon: (isString(options.icon) || isUndefined(options.icon)) ? options.icon : options.icon.x32,
                            body: options.body,
                            tag: options.tag,
                            requireInteraction: options.requireInteraction
                        }
                    );
                } catch (e) {
                  /*
                   * navigator.serviceWorker 是个只读属性，返回 associated document 的 ServiceWorkerContainer 对象，这个对象提供注册、删除、更新以及和 ServiceWorker 通信的功能
                   * 通过 register 方法针对一个 scriptURL 来创建或更新 ServiceWorkerRegistration，
                   * 并返回一个 Promise 对象，可在之后的回调里使用 ServiceWorkerRegistration 对象，
                   * 它具有 showNotification、getNotification API
                   */
                    if (w.navigator) {
                        w.navigator.serviceWorker.register(options.serviceWorker || 'sw.js');
                        w.navigator.serviceWorker.ready.then(function(registration) {
                            registration.showNotification(
                                title,
                                {
                                    icon: options.icon,
                                    body: options.body,
                                    vibrate: options.vibrate,
                                    tag: options.tag,
                                    data: options.data,
                                    requireInteraction: options.requireInteraction
                                }
                            );
                        });
                    }
                }

            } else if (w.webkitNotifications) {
              /*
               * 老版本 webkit 浏览器
               * 利用 window.webkitNotifications.createNotification(params) 或 window.webkitNotifications.createHTMLNotification(params) 方法来创建一个 Notification 对象
               * 调用刚刚创建的 Notification 对象的 show() 方法来进行显示
               *
               * params:
               * icon, title, body
               */

                notification = w.webkitNotifications.createNotification(
                    options.icon,
                    title,
                    options.body
                );

                notification.show();

            } else if (navigator.mozNotification) {
              /*
               * 针对 Firefox 手机端浏览器
               * navigator.mozNotification.createNotification(params) 构造实例
               *
               * params:
               * title, body, icon
               */
                notification = navigator.mozNotification.createNotification(
                    title,
                    options.body,
                    options.icon
                );

                notification.show();

            } else if (w.external && w.external.msIsSiteMode()) {
              /*
               * 针对 IE9 及以上的浏览器
               * 在 IE 下的 notification 与其他浏览器不同，仅仅是闪烁标签页，直到用户单击该按钮将该窗口在前台显示
               * 每次调用，需先通过 msSiteModeClearIconOverlay 清除已有通知，之后通过 msSiteModeSetIconOverlay 新建通知，再使用 msSiteModeActivate 进行激活
               */

                // 清除之前的通知
                w.external.msSiteModeClearIconOverlay();

                w.external.msSiteModeSetIconOverlay(
                    ((isString(options.icon) || isUndefined(options.icon))
                    ? options.icon
                    : options.icon.x16), title
                );
                w.external.msSiteModeActivate();

                notifications = {};
            } else {
                throw new Error('Unable to create notification: unknown interface');
            }

            // 将新增的 notification 加入全局的 notifications 对象中储存起来，并获取其 ID
            id = addNotification(notification);

            // 在 wrapper 内构建 get/close API，并将暴露出去供外部使用
            wrapper = {
                get: function () {
                    return notification;
                },

                close: function () {
                    closeNotification(id);
                }
            };

            // 如有过期时间，则将自动关闭
            if (options.timeout) {
                setTimeout(function () {
                    wrapper.close();
                }, options.timeout);
            }

            if (typeof(notification) !== 'undefined') {
                /* Notification 回调 */
                if (isFunction(options.onShow))
                    notification.addEventListener('show', options.onShow);

                if (isFunction(options.onError))
                    notification.addEventListener('error', options.onError);

                if (isFunction(options.onClick))
                    notification.addEventListener('click', options.onClick);

                notification.addEventListener('close', onClose);
                notification.addEventListener('cancel', onClose);
            } else if (isFunction(options.onClick)) {
                /* Notification callback for service worker */
                if (isFunction(options.onClick)) {
                    w.addEventListener('notificationclick', function(event) {
                        options.onClick.call(event.notification);
                    });
                }

                w.addEventListener('notificationclose', function(event) {
                    onClose.call(event.notification);
                });
            }

            // 暴露给外部，用户可以通过它进行 get/close 回调
            return wrapper;
        },

        /**
         * 定义权限类型
         * @enum {String}
         * granted: 用户同意 notification
         * denied: 用户拒绝 notification
         * default: 默认，相当于 denied
         */
        Permission = {
            DEFAULT: 'default',
            GRANTED: 'granted',
            DENIED: 'denied'
        },

        Permissions = [Permission.GRANTED, Permission.DEFAULT, Permission.DENIED];

        /* Allow enums to be accessible from Push object */
        self.Permission = Permission;

        /*****************
            Permissions
        /*****************/

        /**
         * notification 请求用户允许通知时的回调
         * @param {Function} callback - Function to execute once permission is granted
         * @return {void}
         */
        self.Permission.request = function (onGranted, onDenied) {

            // 在浏览器不支持通知的时候抛出错误
            if (!self.isSupported) {
                throw new Error(incompatibilityErrorMessage);
            }

            // 默认回调，对获取权限的结果进行判断和处理
            callback = function (result) {

                switch (result) {

                    case self.Permission.GRANTED:
                        hasPermission = true;
                        if (onGranted) onGranted();
                        break;

                    case self.Permission.DENIED:
                        hasPermission = false;
                        if (onDenied) onDenied();
                        break;

                }

            };

            /* Safari 6+, Chrome 23+ */
            if (w.Notification && w.Notification.requestPermission) {
                Notification.requestPermission(callback);
            }
            /* Legacy webkit browsers */
            else if (w.webkitNotifications && w.webkitNotifications.checkPermission) {
                w.webkitNotifications.requestPermission(callback);
            } else {
                throw new Error(incompatibilityErrorMessage);
            }
        };

        /**
         * 判断是否获取了 notification 的权限
         * @return 返回一个 Boolean
         */
        self.Permission.has = function () {
            return hasPermission;
        };

        /**
         * 获取 permission 等级
         * @return {Permission} The permission level
         */
        self.Permission.get = function () {

            var permission;

            /* Return if Push not supported */
            if (!self.isSupported) { throw new Error(incompatibilityErrorMessage); }

            /* Safari 6+, Chrome 23+ */
            if (w.Notification && w.Notification.permissionLevel) {
                permission = w.Notification.permissionLevel;

            /* Legacy webkit browsers */
            } else if (w.webkitNotifications && w.webkitNotifications.checkPermission) {
                permission = Permissions[w.webkitNotifications.checkPermission()];

            /* Firefox 23+ */
            } else if (w.Notification && w.Notification.permission) {
                permission = w.Notification.permission;

            /* Firefox Mobile */
            } else if (navigator.mozNotification) {
                permission = Permissions.GRANTED;

            /* IE9+ */
            } else if (w.external && w.external.msIsSiteMode() !== undefined) {
                permission = w.external.msIsSiteMode() ? Permission.GRANTED : Permission.DEFAULT;
            } else {
                throw new Error(incompatibilityErrorMessage);
            }

            return permission;

        };

        /*********************
            Other Functions
        /*********************/

        /**
         * 检测用户的浏览器是否支持 permission
         * @return {Boolean}
         */
        self.isSupported = (function () {

             var isSupported = false;

             try {

                 isSupported =

                     /* Safari, Chrome */
                     !!(w.Notification ||

                     /* Chrome & ff-html5notifications plugin */
                     w.webkitNotifications ||

                     /* Firefox Mobile */
                     navigator.mozNotification ||

                     /* IE9+ */
                     (w.external && w.external.msIsSiteMode() !== undefined));

             } catch (e) {}

             return isSupported;

         })();

         /**
          * 创建一个新的 notification
          * @param {Array} options
          * @return {void}
          */
        self.create = function (title, options) {

            // 当前浏览器不支持时抛出错误
            if (!self.isSupported) {
                throw new Error(incompatibilityErrorMessage);
            }

            // 检测 title 合法性
            if (!isString(title)) {
                throw new Error('PushError: Title of notification must be a string');
            }

            // 请求通知权限
            if (!self.Permission.has()) {
                return new Promise(function(resolve, reject) {
                    self.Permission.request(function() {
                        try {
                            resolve(createCallback(title, options));
                        } catch (e) {
                            reject(e);
                        }
                    }, function() {
                        reject("Permission request declined");
                    });
                });
            } else {
                return new Promise(function(resolve, reject) {
                    try {
                        resolve(createCallback(title, options));
                    } catch (e) {
                        reject(e);
                    }
                });
            }

        };

        /**
         * 返回 notification 的数量
         * @return {Integer} The notification count
         */
        self.count = function () {
            var count = 0,
                key;
            for (key in notifications) {
                count++;
            }
            return count;
        },

        /**
         * Internal function that returns the path of the last service worker used
         * For testing purposes only
         * @return {String} The service worker path
         */
        self.__lastWorkerPath = function () {
            return self.lastWorkerPath;
        },

        /**
         * 通过 tag 来关闭 notification
         * @param {String} tag - Tag of the notification to close
         * @return {Boolean} 返回代表是否成功关闭的 Boolean
         */
        self.close = function (tag) {
            var key;
            for (key in notifications) {
                notification = notifications[key];
                // 如果 tag 匹配了，则通过 ID 关闭 notification
                if (notification.tag === tag) {
                    return closeNotification(key);
                }
            }
        };

        /**
         * 清除所有的 notification
         * @return {void}
         */
        self.clear = function () {
            var i,
                success = true;
            for (key in notifications) {
                var didClose = closeNotification(key);
                success = success && didClose;
            }
            return success;
        };
    };

    return Push;

});
