"use strict"

module.exports = (function() {
	// Store.js
	var store = {},
		win = (typeof window != 'undefined' ? window : global),
		doc = win.document,
		localStorageName = 'localStorage',
		scriptTag = 'script',
		storage

	store.disabled = false
	store.version = '1.3.20'
	store.set = function(key, value) {}
	store.get = function(key, defaultVal) {}
	store.has = function(key) { return store.get(key) !== undefined }
	store.remove = function(key) {}
	store.clear = function() {}
	store.transact = function(key, defaultVal, transactionFn) {
		if (transactionFn == null) {
			transactionFn = defaultVal
			defaultVal = null
		}
		if (defaultVal == null) {
			defaultVal = {}
		}
		var val = store.get(key, defaultVal)
		transactionFn(val)
		store.set(key, val)
	}
	store.getAll = function() {
		var ret = {}
		store.forEach(function(key, val) {
			ret[key] = val
		})
		return ret
	}
	store.forEach = function() {}
	// 序列化
	store.serialize = function(value) {
		return JSON.stringify(value)
	}
	// 反序列化
	store.deserialize = function(value) {
		if (typeof value != 'string') { return undefined }
		try { return JSON.parse(value) }
		catch(e) { return value || undefined }
	}

	/*
	 * 确保 localStorage 在当前浏览器里是被支持的
	 * https://github.com/marcuswestin/store.js/issues#issue/13
	 */
	function isLocalStorageNameSupported() {
		try { return (localStorageName in win && win[localStorageName]) }
		catch(err) { return false }
	}

	if (isLocalStorageNameSupported()) {
		storage = win[localStorageName]
		store.set = function(key, val) {
			// 缺省 val 的 set 方法相当于 remove 方法
			if (val === undefined) { return store.remove(key) }
			storage.setItem(key, store.serialize(val))
			return val
		}
		store.get = function(key, defaultVal) {
			var val = store.deserialize(storage.getItem(key))
			return (val === undefined ? defaultVal : val)
		}
		store.remove = function(key) { storage.removeItem(key) }
		store.clear = function() { storage.clear() }
		store.forEach = function(callback) {
			// length 是 Storage 接口的只读属性，返回一个整数，表示存储在 Storage 对象里的数据项（data items）数量
			for (var i=0; i<storage.length; i++) {
				// localStorage.key(index) 通过索引获取 key 名
				var key = storage.key(i)
				callback(key, store.get(key))
			}
		}
	} else if (doc && doc.documentElement.addBehavior) {
		// 针对 IE 使用 userData
		// 通过 document.documentElement.addBehavior 进行检测
		var storageOwner,
			storageContainer
		/*
		 * 鉴于 userData 只能针对特定的路径使用，因此需要把数据链接到一个路径上。
		 * 在这里使用 /favicon.ico 作为一个较为安全的选择：
		 * 	1. 所有的浏览器都会对这个路径发送请求
		 * 	2. 即便返回了 404 也不会有什么影响
		 * 鉴于 iframe 可以操作 DOM 元素并使用对应规则（甚至是 404 页面），
		 * 我们针对 favicon，在一个 ActiveXObject(htmlfile) 对象中构造了一个 iframe
		 * (戳: http://msdn.microsoft.com/en-us/library/aa752574(v=VS.85).aspx)，
		 * 在 iframe 的 DOM 中可以进行 userData 的储存
		 */
		try {
			// 创建 XMLHttpRequest 对象
			storageContainer = new ActiveXObject('htmlfile')
			storageContainer.open()
			storageContainer.write('<'+scriptTag+'>document.w=window</'+scriptTag+'><iframe src="/favicon.ico"></iframe>')
			storageContainer.close()
			storageOwner = storageContainer.w.frames[0].document
			storage = storageOwner.createElement('div')
		} catch(e) {
			// 如果 ActiveXObject 的方法失败，则直接通过 document.createElement 创建一个 DOM 对象进行储存
			storage = doc.createElement('div')
			storageOwner = doc.body
		}
		var withIEStorage = function(storeFunction) {
			return function() {
				var args = Array.prototype.slice.call(arguments, 0)
				args.unshift(storage)
				// See http://msdn.microsoft.com/en-us/library/ms531081(v=VS.85).aspx
				// and http://msdn.microsoft.com/en-us/library/ms531424(v=VS.85).aspx
				storageOwner.appendChild(storage)
				storage.addBehavior('#default#userData')
				storage.load(localStorageName)
				var result = storeFunction.apply(store, args)
				storageOwner.removeChild(storage)
				return result
			}
		}

		// 在 IE7 下，key 不能以数字或特殊字符开头
		// 戳 https://github.com/marcuswestin/store.js/issues/40
		// 和 https://github.com/marcuswestin/store.js/issues/83
		var forbiddenCharsRegex = new RegExp("[!\"#$%&'()*+,/\\\\:;<=>?@[\\]^`{|}~]", "g")
		var ieKeyFix = function(key) {
			return key.replace(/^d/, '___$&').replace(forbiddenCharsRegex, '___')
		}
		/*
		 * 通过 withIEStorage 的封装，set/get/remove/clear/forEach 不需要传入 storage 参数
		 * 在 withIEStorage 内部，会在每次操作的时候增加一个 div，并将其 behavior 定义为 #default#userData
		 * 然后在调用完对应的方法之后移除掉它
		 */
		store.set = withIEStorage(function(storage, key, val) {
			key = ieKeyFix(key)
			if (val === undefined) { return store.remove(key) }
			// 本质上是将数据作为 DOM 的 attribute 存起来
			storage.setAttribute(key, store.serialize(val))
			storage.save(localStorageName)
			return val
		})
		store.get = withIEStorage(function(storage, key, defaultVal) {
			key = ieKeyFix(key)
			var val = store.deserialize(storage.getAttribute(key))
			return (val === undefined ? defaultVal : val)
		})
		store.remove = withIEStorage(function(storage, key) {
			key = ieKeyFix(key)
			storage.removeAttribute(key)
			storage.save(localStorageName)
		})
		store.clear = withIEStorage(function(storage) {
			var attributes = storage.XMLDocument.documentElement.attributes
			storage.load(localStorageName)
			for (var i=attributes.length-1; i>=0; i--) {
				storage.removeAttribute(attributes[i].name)
			}
			storage.save(localStorageName)
		})
		store.forEach = withIEStorage(function(storage, callback) {
			var attributes = storage.XMLDocument.documentElement.attributes
			for (var i=0, attr; attr=attributes[i]; ++i) {
				callback(attr.name, store.deserialize(storage.getAttribute(attr.name)))
			}
		})
	}

	try {
		// 通过尝试存取一个字段来判断是否支持 store
		var testKey = '__storejs__'
		store.set(testKey, testKey)
		if (store.get(testKey) != testKey) { store.disabled = true }
		store.remove(testKey)
	} catch(e) {
		store.disabled = true
	}
	store.enabled = !store.disabled

	return store
}())
