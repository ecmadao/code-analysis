/*
 * jQuery Hotkeys Plugin
 *
 * 基于 Tzury Bar Yochay 编写的插件:
 * https://github.com/tzuryby/jquery.hotkeys
 *
 * 最初的想法起源于:
 * Binny V A, http://www.openjs.com/scripts/events/keyboard_shortcuts/
 */

(function(jQuery) {

  jQuery.hotkeys = {
    version: "0.2.0",

    specialKeys: {
      8: "backspace",
      9: "tab",
      10: "return",
      13: "return",
      16: "shift",
      17: "ctrl",
      18: "alt",
      19: "pause",
      20: "capslock",
      27: "esc",
      32: "space",
      33: "pageup",
      34: "pagedown",
      35: "end",
      36: "home",
      37: "left",
      38: "up",
      39: "right",
      40: "down",
      45: "insert",
      46: "del",
      59: ";",
      61: "=",
      96: "0",
      97: "1",
      98: "2",
      99: "3",
      100: "4",
      101: "5",
      102: "6",
      103: "7",
      104: "8",
      105: "9",
      106: "*",
      107: "+",
      109: "-",
      110: ".",
      111: "/",
      112: "f1",
      113: "f2",
      114: "f3",
      115: "f4",
      116: "f5",
      117: "f6",
      118: "f7",
      119: "f8",
      120: "f9",
      121: "f10",
      122: "f11",
      123: "f12",
      144: "numlock",
      145: "scroll",
      173: "-",
      186: ";",
      187: "=",
      188: ",",
      189: "-",
      190: ".",
      191: "/",
      192: "`",
      219: "[",
      220: "\\",
      221: "]",
      222: "'"
    },

    shiftNums: {
      "`": "~",
      "1": "!",
      "2": "@",
      "3": "#",
      "4": "$",
      "5": "%",
      "6": "^",
      "7": "&",
      "8": "*",
      "9": "(",
      "0": ")",
      "-": "_",
      "=": "+",
      ";": ": ",
      "'": "\"",
      ",": "<",
      ".": ">",
      "/": "?",
      "\\": "|"
    },

    // input 类型，不包括：
    // button, checkbox, file, hidden, image, password, radio, reset, search, submit, url
    textAcceptingInputTypes: [
      "text", "password", "number", "email", "url", "range", "date", "month", "week", "time", "datetime",
      "datetime-local", "search", "color", "tel"],

    // 除非直接绑定，否则默认情况下 input 不会绑定监听
    textInputTypes: /textarea|input|select/i,

    options: {
      filterInputAcceptingElements: true,
      filterTextInputs: true,
      filterContentEditable: true
    }
  };

  /**
   * special event method
   * keyHandler 方法是 keydown 时会触发的方法，
   * 在其中对 key 进行判断，针对响应的 key 进行 callback 回调
   * @param handleObj
   * handleObj: {
   *  type: event 名称
   *  data: 传递给这个事件的数据
   *  handler: 事件处理函数
   * }
   */
  function keyHandler(handleObj) {
    if (typeof handleObj.data === "string") {
      handleObj.data = {
        keys: handleObj.data
      };
    }

    if (!handleObj.data || !handleObj.data.keys || typeof handleObj.data.keys !== "string") {
      return;
    }

    // origHandler 是事件监听的回调，即用户注册监听事件时所定义的 callback
    var origHandler = handleObj.handler,
    // 可以一次绑定监听多种按键组合，不同组合之间使用空格分隔
      keys = handleObj.data.keys.toLowerCase().split(" ");

    handleObj.handler = function(event) {
      // 对于 inputs，因为在默认情况下不会绑定监听，因此直接返回
      if (this !== event.target &&
        (jQuery.hotkeys.options.filterInputAcceptingElements &&
          jQuery.hotkeys.textInputTypes.test(event.target.nodeName) ||
          (jQuery.hotkeys.options.filterContentEditable && jQuery(event.target).attr('contenteditable')) ||
          (jQuery.hotkeys.options.filterTextInputs &&
            // 通过 jQuery.inArray 判断 target 是否在一个 Array 里
            jQuery.inArray(event.target.type, jQuery.hotkeys.textAcceptingInputTypes) > -1))) {
        return;
      }

      /*
       * event.which 为按键 code，type 为 int
       * 通过 jQuery.hotkeys.specialKeys[event.which] 拿到其按键名称
       */
      var special = event.type !== "keypress" && jQuery.hotkeys.specialKeys[event.which],
      // String.fromCharCode() 静态方法根据指定的 Unicode 编码中的序号值来返回一个字符串
        character = String.fromCharCode(event.which).toLowerCase(),
        modif = "",
        possible = {};

      /*
       * 对 alt/ctrl/shift 组合键的判断
       * 如果 special 不是 alt/ctrl/shift 中的任一个，且 存在 event.altKey/event.ctrlKey/event.shiftKey，
       * 则可以认为 alt/ctrl/shift 键处于按下的状态
       */
      jQuery.each(["alt", "ctrl", "shift"], function(index, specialKey) {
        if (event[specialKey + 'Key'] && special !== specialKey) {
          modif += specialKey + '+';
        }
      });

      /*
       * 对 metaKey 组合键的判断
       * event.metaKey
       * 在 Mac 上代表 command 键，在 Windows 上则代表 win 键
       */
      if (event.metaKey && !event.ctrlKey && special !== "meta") {
        modif += "meta+";
      }

      // 如果同时按下了 alt+ctrl+shift 和 meta 键
      if (event.metaKey && special !== "meta" && modif.indexOf("alt+ctrl+shift+") > -1) {
        modif = modif.replace("alt+ctrl+shift+", "hyper+");
      }

      // 对获取的按键码进行组合
      if (special) {
        possible[modif + special] = true;
      }
      else {
        possible[modif + character] = true;
        possible[modif + jQuery.hotkeys.shiftNums[character]] = true;

        // 将 Shift+keyCode 转换为 keyCode
        // 例如，
        // "$" 可以被认为是 "Shift+4" 或者 "Shift+$" 或者 "$"
        if (modif === "shift+") {
          possible[jQuery.hotkeys.shiftNums[character]] = true;
        }
      }

      // 如果绑定的按键(组合)中有任意一个被触发，则就触发回调
      for (var i = 0, l = keys.length; i < l; i++) {
        if (possible[keys[i]]) {
          return origHandler.apply(this, arguments);
        }
      }
    };
  }

  /*
   * jQuery(elem).bind(type, data, callback)
   * 实际上是映射到 jQuery.event.add(elem, types, handler, data)
   * http://benalman.com/news/2010/03/jquery-special-events
   *
   * 通过
   * jQuery.event.special.xxxEvent = {
   *  setup: func, 在事件被bind时调用，仅调用一次
   *  teardown: func, 在解除bind时调用，仅调用一次
   *  add: func，每次绑定到元素上的时候都会调用
   * }
   * 来创建一个新的事件
   *
   * 也就是说，通过调用下面的方法之后，在
   * $(dom).bind('keydown', key, callback)，或者 keyup/keypress 时会触发 keyHandler 方法
   * keyHandler 默认接收一个参数 handleObj，事件绑定时的 callback 会赋值给 handleObj.handler
   */
  jQuery.each(["keydown", "keyup", "keypress"], function() {
    jQuery.event.special[this] = {
      add: keyHandler
    };
  });

})(jQuery || this.jQuery || window.jQuery);
