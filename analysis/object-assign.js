'use strict';
/* eslint-disable no-unused-vars */
/**
 * Object.getOwnPropertySymbols(obj)
 * 返回一个数组，该数组包含了指定对象自身的（非继承的）所有 symbol 属性键
 *
 * Object.prototype.hasOwnProperty(prop)
 * 判断某个对象是否含有指定的自身属性，而不是继承的属性
 *
 * Object.prototype.propertyIsEnumerable(prop)
 * 返回一个布尔值，表明指定的属性名是否是当前对象可枚举的自身属性。即属性既是 ownProperty，又 enumerable
 *
 */

var getOwnPropertySymbols = Object.getOwnPropertySymbols;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

/**
 * 对象属性的遍历
 *
 * 通过 for..in.. 来遍历对象以及原型链上可枚举的属性，不包含 Symbol
 * Object.keys(obj) 获取对象上的可枚举属性，不包括原型链，≈ for..in.. + hasOwnProperty
 * Object.getOwnPropertyNames(obj) 获取对象上的全部属性（包括不可枚举属性）
 *
 * 更多内容，可见：属性的可枚举性和所有权
 * https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Enumerability_and_ownership_of_properties
 *
 */

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

function shouldUseNative() {
	try {
		// 检查当前环境是否支持原生的 Object.assign
		if (!Object.assign) {
			return false;
		}

		/**
		 * Detect buggy property enumeration order in older V8 versions.
		 *
		 * Object.getOwnPropertyNames(obj)
		 * 返回一个由指定对象的所有自身属性的属性名（包括不可枚举属性）组成的数组
		 */

		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
		var test1 = new String('abc');
		test1[5] = 'de';
		if (Object.getOwnPropertyNames(test1)[0] === '5') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test2 = {};
		for (var i = 0; i < 10; i++) {
			test2['_' + String.fromCharCode(i)] = i;
		}
		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
			return test2[n];
		});
		if (order2.join('') !== '0123456789') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test3 = {};
		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
			test3[letter] = letter;
		});
		if (Object.keys(Object.assign({}, test3)).join('') !==
				'abcdefghijklmnopqrst') {
			return false;
		}

		return true;
	} catch (err) {
		return false;
	}
}

module.exports = shouldUseNative() ? Object.assign : function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	// 忽略第一个 target 参数，从 source 开始遍历；可以代入多个对象合并，也就是多个 source
	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		/**
		 * for..in.. 会输出自身以及原型链上可枚举的属性，不包含 Symbol
		 * 如果对象的属性是它独有而不是继承的，则将 key:value 键值对赋值给 target
		 */

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		/**
		 * 获取所有的 Symbols 进行遍历
		 * 如果 symbol 既是 ownProperty，又 enumerable，则可以合并
		 */

		if (getOwnPropertySymbols) {
			symbols = getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};
