/*
* 该库的作用是将 console.log 转换为浏览器通知的形式
* github见：https://github.com/hkirat/notification-logger
 */

(function() {
	var isInitialized = false, _console = {};
	Notification.requestPermission();
	// Get current notification icon
	icon = "notifications.png"

	function modifyIcon(icon_path) {
		logger.icon = icon_path;
	}

	/*
	 * 核心函数
	 * 用于触发浏览器 Notification API 以进行通知
	 * 关于 Notification 的更详细介绍可见：
	 * https://developer.mozilla.org/zh-CN/docs/Web/API/notification
	 */
	function log(body, title) {
		title = title || "Notification";
		/*
		 * 如果浏览器支持弹出通知，则在 window 对象中会有一个 Notification 对象
		 */
		if (!("Notification" in window)) {
		    alert("This browser does not support desktop notification");
	  	} else if (Notification.permission === "granted") {
			/*
			 * Notification.permission 字段，只读
			 * denied：用户拒绝了浏览器通知
			 * granted：用户同意了浏览器通知
			 * default：不知道用户的选择，相当于 denied
			 *
			 * 通过 new Notification 构造一个通知
			 * title：通知的标题
			 * body：通知的文本内容
			 * icon：通知上显示的图标
			 */
			new Notification(title ,{body: body, icon: logger.icon});
	    } else if (Notification.permission !== 'denied') {
	    	Notification.requestPermission(function (permission) {
				if (permission === "granted") {
					new Notification(title ,{body: body});
				}
	    });
	  }
	}

	function originalFnCallDecorator(fn, fnName) {
		return function() {
			fn.apply(this, arguments);
			if (typeof _console[fnName] === 'function') {
				_console[fnName].apply(console, arguments);
			}
		};
	}

	function destroy() {
		isInitialized = false;
		console.log = _console.log;
	}

	function init() {
		if (isInitialized) { return; }
		isInitialized = true;
		// 将 console.log 方法保存在 _console.log 中，以便 destroy 之后复原
		_console.log = console.log;
		/*
		 * 替换原生的 console.log 方法
		 * 返回一个 func，func被调用时会触发 log 方法，但同时也会检测 _console 中是否保存了原有的 log 方法，如果有，则继续调用原有方法
		 */
		console.log = originalFnCallDecorator(log, 'log');
	}

	window.logger = {
		log: log,
		init: init,
		destroy:destroy,
		modifyIcon: modifyIcon,
		icon: icon
	}
})();
