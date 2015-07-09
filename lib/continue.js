/* continue.js 1.x -- A very easy and clean async flow controller
 *
 * Copyright (C) 2015 Chizhong Jin
 * All rights reserved.
 *
 * This software may be modified and distributed under the terms
 * of the BSD license.  See the LICENSE file for details.
 */

'use strict';

var depget = function(v, sub) {
  sub.split('.').forEach(function(s) {
    v = v[s];
    if (v === undefined) {
      return v;
    }
  });
  return v;
};

var C_proto = {
  __proto__: Function,
  constructor: function(node, locals) {
    var obj = function() {
      obj.invoke.apply(obj, arguments);
    };
    obj.__proto__ = C_proto;
    obj.node = node;
    obj.locals = locals;
    obj.next = node.next;
    return obj;
  },
  double_invoke_protect: function() {
    if (this.invoked) {
      throw new Error('continue.js: c() invoked double times');
    }
    this.invoked = true;
  },
  invoke: function() {
    this.double_invoke_protect();
    this.locals.args = arguments;
    this.next.invoke(this.locals);
  },
};
var C = C_proto.constructor;
C.prototype = C_proto;

var Block_proto = {
  __proto__: Function,
  constructor: function() {
    var obj = function() {
      obj.invoke.apply(obj, arguments);
    };
    obj.__proto__ = Block_proto;
    return obj;
  },
  genNext: function() {
    this.next = Block_proto.constructor();
    this.next.first = this.first;
    return this.next;
  },
  then: function(func) {
    this.invoke = function(locals) {
      if (locals.err === null) {
        if (func.length <= 2 || locals.args.length === 0) {
          func(C(this, locals), locals);
        } else {
          var args = [C(this, locals), locals].concat(Array.prototype.slice.call(locals.args));
          func.apply(this, args);
        }
      } else {
        this.next.invoke(locals);
      }
    };
    return this.genNext();
  },
  last: function(func) {
    this.invoke = function(locals) {
      func(locals.err, locals);
    };
    var adv = this.adv;
    this.first.invoke({adv: adv});
  },
  stdend: function() {
    var assign = Array.prototype.slice.call(arguments);
    var callback = function(){};
    if (assign.length > 0 && typeof assign[assign.length - 1] === 'function') {
      callback = assign[assign.length - 1];
      assign = assign.slice(0, assign.length - 1);
    }

    this.last(function(err, locals) {
      var args = [locals.err];
      assign.forEach(function(a) {
        args.push(depget(locals, a));
      });
      callback.apply(this, args);
    });
  }
};
var Block = Block_proto.constructor;
Block.prototype = Block_proto;

var S = function() {
  var b = Block();
  b.adv = {};
  for (var i = 0; i < arguments.length; ++i) {
    b.adv[arguments[i]] = true;
  }
  b.first = b;
  return b;
};

module.exports = S;
