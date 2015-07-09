/* continue.js 1.x -- A very easy and clean async flow controller
 *
 * Copyright (C) 2015 Chizhong Jin
 * All rights reserved.
 *
 * This software may be modified and distributed under the terms
 * of the BSD license.  See the LICENSE file for details.
 */

'use strict';

var func_length_n = function(n, func) {
  // black magic, here !!! help me, if you have better idea
  switch (n) {
    case 0:  return function() {return func(arguments)};
    case 1:  return function(a) {return func(arguments)};
    case 2:  return function(a, b) {return func(arguments)};
    case 3:  return function(a, b, c) {return func(arguments)};
    case 4:  return function(a, b, c, d) {return func(arguments)};
    case 5:  return function(a, b, c, d, e) {return func(arguments)};
    case 6:  return function(a, b, c, d, e, f) {return func(arguments)};
    case 7:  return function(a, b, c, d, e, f, g) {return func(arguments)};
    case 8:  return function(a, b, c, d, e, f, g, h) {return func(arguments)};
    case 9:  return function(a, b, c, d, e, f, g, h, i) {return func(arguments)};
  }
  // >= 10
  var args = [];
  for (var i = 0; i < n; ++i) {
    args.push('a' + i);
  }
  args.push('return this(arguments);');
  return Function.prototype.constructor.apply(this, args).bind(func);
};

var C_proto = {
  __proto__: Function,
  constructor: function (node, locals) {
    var obj = function() {
      obj.invoke.apply(obj, arguments);
    };
    obj.__proto__ = C_proto;
    obj.node = node;
    obj.locals = locals;
    return obj;
  }, 
  double_invoke_protect: function() {
    if (this.invoked) {
      throw 'continue.js: c() invoked double times';
    }
    this.invoked = true;
  },
  invoke: function () {
    this.node.catch_exception = false;
    this.double_invoke_protect();
    this.locals.args = arguments;
    this.node.next.invoke(this.locals);
  },
  assign: function() {
    var keys = arguments;
    var c = this;
    var locals = c.locals;
    var func = function(args) {
      for (var i = 0; i < keys.length; ++i) {
        if (keys[i] !== null) {
          locals[keys[i]] = args[i];
        }
      }
      c.invoke.apply(c, args);
    };
    return func_length_n(keys.length, func);
  },
  assign2: function() {
    var key_pairs = arguments;
    var c = this;
    var locals = c.locals;
    var func = function(args) {
      for (var i = 0; i < key_pairs.length / 2; ++i) {
        if (key_pairs[i * 2] !== null && key_pairs[i * 2 + 1] !== null) {
          key_pairs[i * 2][key_pairs[i * 2 + 1]] = args[i];
        }
      }
      c.invoke.apply(c, args);
    };
    return func_length_n(key_pairs.length / 2, func);
  },
  get fail () {
    return function(err) {
      this.locals.err = err === undefined ? 'error' : err;
      this.invoke();
    }.bind(this);
  }
};
var C = C_proto.constructor;
C.prototype = C_proto;


var Block_proto = {
  __proto__: Function,
  constructor: function () {
    var obj = function() {
      return obj.then.apply(obj, arguments);
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
      // catch_exception closed when c() invoked.
      this.catch_exception = true;
      try {
        var last_err = locals.err;
        if (last_err !== undefined && last_err !== null) {
          if (func.length >= 3) {
            locals.err = null;
            func(last_err, C(this, locals), locals);
          } else {
            this.next.invoke(locals);
          }
        } else {
          if (func.length < 3) {
            func(C(this, locals), locals);
          } else {
            this.next.invoke(locals);
          }
        }
      } catch (err) {
        if (this.catch_exception) {
          locals.err = err;
          this.next.invoke(locals);
        } else {
          throw err;
        }
      }
    };
    return this.genNext();
  },
  end: function() {
    var args = Array.prototype.slice.call(arguments);
    var silent = args.length > 0 && args[0].constructor === Boolean ? args.shift() : false;
    var func = args.pop();
    var assign = args;

    this.invoke = function(locals) {
      if (!silent && locals.err !== undefined && locals.err !== null) {
        throw locals.err;
      }
      if (func) {
        var args = [];
        assign.forEach(function (a) {
          args.push(locals[a]);
        });
        func.apply(this, args);
      }
    };

    this.first.invoke({});
  },
  done: function(func) {
    this.invoke = function(locals) {
      func(locals.err, locals);
    };

    this.first.invoke({});
  }
};
var Block = Block_proto.constructor;
Block.prototype = Block_proto;


var s_proxy = function(name) {
  return function() {
    var b = Block();
    b.first = b;
    return b[name].apply(b, arguments);
  };
};
var S = s_proxy('then');
S.then = s_proxy('then');
S.end = s_proxy('end');
S.done = s_proxy('done');

module.exports = S;
