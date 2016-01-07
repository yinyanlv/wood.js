"use strict";
(function (window) {
  var version = '0.0.1';
  var wood;
  var $;
  var classList = 'Boolean Number String Function Array Date RegExp Object Error'.split(' ');
  var class2type = {};
  var gTempParent = document.createElement('div');
  var containerMap = {
    'td': document.createElement('tr'),
    'tr': document.createElement('tbody'),
    'tbody': document.createElement('table'),
    '*': document.createElement('div')
  };
  var attrMethodList = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'];
  var init = (function () {
    classList.forEach(function (item) {
      class2type['[object '+ item +']'] = item.toLowerCase();
    });
  }());

  var regex = {
    simpleSelector: /^[\w-]*$/,
    fragment: /^\s*<(\w+|!)[^>]*>/,
    singleTag: /^<(\w+\s*\/?)(?:<\/\1>|)$/,
    tagExpander: /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
    ready: /complete|loaded|interactive/
  };

  var util = {
    concat: Array.prototype.concat,
    filter: Array.prototype.filter,
    slice: Array.prototype.slice,
    splice: Array.prototype.splice,
    push: Array.prototype.push,
    pop: Array.prototype.pop,
    forEach: Array.prototype.forEach,
    sort: Array.prototype.sort,
    reduce: Array.prototype.reduce,
    indexOf: Array.prototype.indexOf,
    every: Array.prototype.every,
    some: Array.prototype.some,
    toString: Object.prototype.toString(),
    typeOf: function (obj) {
      return obj === null ? String(obj) : class2type[this.toString.call(obj)] || 'object';
    },
    isWindow: function (obj) {
      return obj !== null && obj === obj.window;
    },
    isDocument: function (obj) {
      //DOCUMENT_NODE 9,nodeType 9
      return obj !== null && obj.nodeType === obj.DOCUMENT_NODE;
    },
    isFunction: function (obj) {
      return this.typeOf(obj) === 'function';
    },
    isObject: function (obj) {
      return this.typeOf(obj) === 'object';
    },
    isPlainObject: function (obj) {
      return obj !== null && this.isObject(obj) && !this.isWindow(obj) && (Object.getPrototypeOf(obj) === Object.prototype);
    },
    isEmptyObject: function (obj) {
      var key;
      for (key in obj) {
        return false;
      }
      return true;
    },
    isArrayLike: function (obj) {
      return this.typeOf(obj.length) === 'number';
    },
    isArray: function (obj) {
      return Array.isArray ? Array.isArray(obj) : obj instanceof Array;
    },
    compact: function (arr) {
      return this.filter.call(arr, function (item) {
        return item !== null;
      });
    },
    extend: function (target, source, isDeep) {
      var key;
      for (key in source) {
        if (!isDeep && (source[key] !== undefined)) {
          target[key] = source[key];
          continue;
        }
        if (isDeep && this.isPlainObject(source[key] && !this.isPlainObject(target[key]))) {
          target[key] = {};
        }
        if (isDeep && this.isArray(source[key] && !this.isArray(target[key]))) {
          target[key] = [];
        }
        this.extend(target[key], source[key], isDeep);
      }
      return target;
    }
  };

  wood = {
    init: function (selector, context) {
      var dom;
      if (!selector) {
        this.build();
      } else if (typeof selector === 'string') {
        selector = selector.trim();
        if (selector[0] === '<' && regex.fragment.test(selector)) {
          dom = this.fragment(selector, RegExp.$1, context);
          selector = null;
        } else if (context !== undefined) {
          return $(context).find(selector);
        } else {
          dom = this.qsa(document, selector);
        }
      } else if (util.isFunction(selector)) {
        return $(document).ready(selector);
      } else if (this.isWood(selector)) {
        return selector;
      } else {
        if (util.isArray(selector)) {
          dom = util.compact(selector);
        } else if (util.isObject(selector)) {
          dom = [selector];
          selector = null;
        } else if (regex.fragment.test(selector)) {
          dom = this.fragment(selector.trim(), RegExp.$1, context);
          selector = null;
        } else if (context !== undefined) {
          return $(context).find(selector);
        } else {
          dom = this.qsa(document, selector);
        }
      }
      return this.build(dom, selector);
    },
    build: function (dom, selector) {
      return new this.generateWood(dom, selector);
    },
    generateWood: function (dom, selector) {
      var i;
      var len = dom ? dom.length : 0;
      for (i = 0; i < len; i++) {
        this[i] = dom[i];
      }
      this.length = len;
      this.selector = selector || '';
    },
    isWood: function (obj) {
      return obj instanceof this.generateWood;
    },
    matches: function (element, selector) {
      if (!element || !selector || (element.nodeType !== 1)) {
        return false;
      }
      //检测dom元素是否匹配某css selector
      var matchesSelector = element.matchesSelector ||
        element.webkitMatchesSelector ||
        element.mozMatchesSelector ||
        element.oMatchesSelector;
      if (matchesSelector) {
        return matchesSelector.call(element, selector);
      }
      var matchedIndex;
      var parent = element.parentNode;
      var isNotExist = !parent;
      if (isNotExist) {
        parent = gTempParent;
        parent.appendChild(element);
      }
      //~ 先取反再减一，如：~-1 === 0
      matchedIndex = ~(wood.qsa(parent, selector).indexOf(element));
      isNotExist && gTempParent.removeChild(element);
      return matchedIndex;
    },
    qsa: function (element, selector) {
      var temp;
      var isId = selector[0] === '#';
      var isClass = !isId && selector[0] === '.';
      var selectorBody = (isId || isClass) ? selector.slice(1) : selector;
      var isSimple = regex.simpleSelector.test(selectorBody); //是否为简单选择器(只有一级)。如：#a, .a, a
      //safari DocumentFragment(nodeType 11)没有getElementById方法
      if (element.getElementById && isSimple && isId) {
        temp = element.getElementById(selectorBody);
        return temp ? [temp] : [];
      } else if ([1, 9, 11].indexOf(element.nodeType) === -1) { //1 Element, 9 Document, 11 DocumentFragment
        return [];
      } else {
        //所有浏览器，DocumentFragment没有getElementsByClassName和getElementsByTagName
        if (isSimple && !isId && element.getElementsByClassName) {
          return isClass ? element.getElementsByClassName(selectorBody) : element.getElementsByTagName(selector);
        } else {
          return element.querySelectorAll(selector);
        }
      }
    },
    fragment: function (html, name, props) {
      var dom, $node, container;
      if (regex.singleTag.test(html)) {
        dom = $(document.createElement(RegExp.$1));
      }
      if (!dom) {
        if (html.replace) {
          html = html.replace(regex.tagExpander, '<$1></$1>')
        }
        if (name === undefined) {
          name = regex.fragment.test(html) && RegExp.$1;
        }
        if (!(name in containerMap)) {
          name = '*';
        }
        container = containerMap[name];
        container.innerHTML = html;
        dom = util.forEach.call(util.slice.call(container.childNodes), function (item) {
          container.removeChild(item);
        });
      }
      if (util.isPlainObject(props)) {
        $node = $(dom);
        var key;
        for (key in props) {
          if (attrMethodList.indexOf(key)> -1) {
            $node[key](props[key]);
          } else {
            $node.attr(key, props[key]);
          }
        }
      }
    },
    traverseNode: function (node, callback) {
      callback(node);
      for (var i = 0, len = node.childNodes.length; i < len; i++) {
        this.traverseNode(ndoe.childNodes[i], callback);
      }
    }
  };

  $ = function (selector, context) {
    return wood.init(selector, context);
  };

  $.extend = function (target) {
    var isDeep;
    var args = util.slice.call(arguments, 1);
    if (typeof target === 'boolean') {
      isDeep = target;
      target = args.shift();
    }
    args.forEach(function (item) {
      util.extend(target, item, isDeep);
    });
    return target;
  };

  $.each = function (elementList, callback) {
    var i, key;
    if (util.isArrayLike(elementList)) {
      for (i = 0; i < elementList.length, i++) {
        if (callback.call(elementList[i], i) === false) {
          return elementList;
        }
      }
    } else {
      for (key in elementList) {
        if (callback.call(elementList[key], key) === false) {
          return elementList;
        }
      }
    }
    return elementList;
  };

  $.contains = document.documentElement.contains ?
    function (parent, node) {
      return parent !== node && parent.contains(node)
    } :
    function (parent, node) {
      while (node && (node = node.parentNode)) {
        if (node === parent) {
          return true;
        }
      }
      return false;
    };

  $.map = function (elementList, callback) {
    var item, itemList, i, key;
    if (util.isArrayLike(elementList)) {
      for (i = 0; i < elementList.length, i++) {
        item = callback(elementList[i], i);
        if (item !== null) {
          itemList.push(item);
        }
      }
    } else {
      for (key in elementList) {
        item = callback(elementList[key], key);
        if (item !== null) {
          itemList.push(item);
        }
      }
    }
    return itemList;
  };

  $.fn = {
    constructor: wood.build,
    forEach: util.forEach,
    reduce: util.reduce,
    push: util.push,
    sort: util.sort,
    splice: util.splice,
    indexOf: util.indexOf,
    map: function (callback) {
      return $($.map(this, function (item, index) {
        return callback.call(item, index);
      }));
    },
    each: function (callback) {
      util.every.call(this, function (item, index) {
        return callback.call(item, index) !== false;
      });
      return this;
    },
    filter: function (selector) {
      if (util.isFunction(selector)) {
        return this.not(this.not(selector));
      }
      return $(util.filter.call(this, function (item) {
        return zepto.matches(item, selector);
      }));
    },
    length: 0,
    ready: function (callback) {
      //需要为IE检测document.body已经存在
      if (regex.ready.test(document.readyState) && document.body) {
        callback($);
      } else {
        document.addEventListener('DOMContentLoaded', function () {
          callback($);
        }, false);
      }
      return this;
    },
    get: function (index) {
      return index === undefined ? util.slice.call(this) : this[index >= 0 ? index : index + this.length];
    },
    toArray: function () {
      return this.get();
    },
    size: function () {
      return this.length;
    },
    remove: function (callback) {
      return this.each(function (item, index) {
        if (item.parentNode !== null) {
          item.parentNode.removeChild(item);
        }
      });
    },
    is: function (selector) {
      return this.length > 0 && wood.matches(this[0], selector);
    },
    not: function (selector) {
      var nodeList = [];
      if (util.isFunction(selector)) {
        //TODO
        this.each(function (item) {
          if (!selector.call(this, item)) {
            nodeList.push(item);
          }
        });
      } else {
        var excludeList;
        if (typeof selector === 'string') {
          excludeList = this.filter(selector);
        } else {
          excludeList = util.isArrayLike(selector) && util.isFunction(selector) ? util.slice(selector) : $(selector);
        }
        this.forEach(function (item) {
          if (excludeList.indexOf(item) < 0) {
            nodes.push(item);
          }
        });
      }
      return $(nodeList);
    },
    has: function (selector) {
      return this.filter(function () {
        return util.isObject(selector) ? $.contains(this, selector) : $(this).find(selector).size();
      });
    },
    eq: function (index) {
      return this.slice(index, + index + 1);
    },
    first: function () {
      var elem = this[0];
      return elem && util.isObject(elem) ? elem : $(elem);
    },
    last: function () {
      var elem = this[this.length - 1];
      return elem && util.isObject(elem) ? elem : $(elem);
    },
    find: function (selector) {
      var self = this;
      if (!selector) {
        return $();
      } else if (typeof selector === 'object') {
        return $(selector).filter(function () {
          var node = this;
          return util.some.call(self, function (parent) {
            return $.contains(parent, node);
          });
        });
      } else if (this.length === 1) {
        return $(wood.qsa(this[0], selector));
      } else {

      }
    }
  };

  wood.build.prototype = wood.generateWood.prototype = $.fn;
  $.wood = wood;

  window.WOOD = wood;
  window.$ = $;
}(window));