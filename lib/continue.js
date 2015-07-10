/* continue.js 1.x -- A very easy and clean async flow controller
 *
 * Copyright (C) 2015 Chizhong Jin
 * All rights reserved.
 *
 * This software may be modified and distributed under the terms
 * of the BSD license.  See the LICENSE file for details.
 */

'use strict';

var Promise = require('promise');

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

var depget = function(v, sub) {
  sub.split('.').forEach(function(s) {
    v = v[s];
    if (v === undefined) {
      return v;
    }
  });
  return v;
};

var depset = function(v, sub, val) {
  var ss = sub.split('.');
  for (var i = 0; i < ss.length - 1; ++i) {
    if (v[ss[i]] === undefined) {
      v[ss[i]] = {};
    }
    v = v[ss[i]];
  }
  v[ss[ss.length - 1]] = val;
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
    this.node.catch_exception = false;
    this.double_invoke_protect();
    this.locals.args = arguments;
    this.next.invoke(this.locals);
  },
  get accept () {
    var c = this;
    var obj = function() {
      c.locals.err = null;
      c.apply(c, arguments);
    };
    obj.__proto__ = this;
    return obj;
  },
  get reject () {
    var c = this;
    var obj = function(err) {
      c.locals.err = (err === null || err === undefined) ? 'UnknownError' : err;
      c.apply(c, arguments);
    };
    obj.__proto__ = this;
    return obj;
  },
  get break () {
    var c = this;
    var obj = function(err) {
      var body = c;
      while (!body.hasOwnProperty('node')) {
        body = body.__proto__;
      }
      var node = body.node;
      while (node.next) {
        node = node.next;
      }
      body.next = node;
      body.locals.adv.breaked = true;
      c.apply(c, arguments);
    };
    obj.__proto__ = this;
    return obj;
  },
  assign: function() {
    var keys = arguments;
    var c = this;
    var locals = c.locals;
    var func = function(args) {
      for (var i = 0; i < keys.length; ++i) {
        if (keys[i] !== null) {
          depset(locals, keys[i], args[i]);
        }
      }
      c.apply(c, args);
    };
    var obj = func_length_n(keys.length, func);
    obj.__proto__ = this;
    return obj;
  },
  assign2: function() {
    var key_pairs = arguments;
    var c = this;
    var locals = c.locals;
    var func = function(args) {
      for (var i = 0; i < key_pairs.length / 2; ++i) {
        if (key_pairs[i * 2] !== null && key_pairs[i * 2 + 1] !== null) {
          depset(key_pairs[i * 2], key_pairs[i * 2 + 1], args[i]);
        }
      }
      c.apply(c, args);
    };
    var obj = func_length_n(key_pairs.length / 2, func);
    obj.__proto__ = this;
    return obj;
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
  isPromise: function(v) {
    if (v === undefined || v === null) {
      return false;
    }
    if (v instanceof C || v instanceof Block) {
      throw 'Continue.js is not promise, do not return it ever!'
    }
    if (typeof v.then === 'function') {
      return true;
    }
    return false;
  },
  exception_protect: function(locals, c, func) {
    var r;
    if (locals.adv.safe) {
      this.catch_exception = true;
      try {
        r = func.apply(this);
      } catch (err) {
        if (this.catch_exception) {
          locals.err = err;
          c();
        } else {
          throw err;
        }
      }
    } else {
      r = func.apply(this);
    }
    if (this.isPromise(r)) {
      r.then(function(value) {
        locals.err = null;
        c.apply(this, arguments);
      }, function(err) {
        locals.err = err;
        c.apply(this, arguments);
      });
    }
  },
  then: function(func) {
    this.invoke = function(locals) {
      if (locals.err === null) {
        var c = C(this, locals);
        this.exception_protect(locals, c, function() {
          if (func.length <= 2 || locals.args.length === 0) {
            return func(c, locals);
          } else {
            var args = [c, locals].concat(Array.prototype.slice.call(locals.args));
            return func.apply(this, args);
          }
        });
      } else {
        this.next.invoke(locals);
      }
    };
    return this.genNext();
  },
  fail: function(func) {
    this.invoke = function(locals) {
      if (locals.err !== null) {
        var c = C(this, locals);
        this.exception_protect(locals, c, function() {
          var last_err = locals.err;
          locals.err = null;
          return func(last_err, c, locals);
        });
      } else {
        this.next.invoke(locals);
      }
    };
    return this.genNext();
  },
  always: function(func) {
    this.invoke = function(locals) {
      var c = C(this, locals);
      this.exception_protect(locals, c, function() {
        var last_err = locals.err;
        locals.err = null;
        return func(last_err, c, locals);
      });
    };
    return this.genNext();
  },
  last: function(func) {
    this.invoke = function(locals) {
      func(locals.err, locals);
    };
    var adv = this.first.adv;
    this.first.invoke({adv: adv, err: null});
  },
  end: function() {
    var assign = Array.prototype.slice.call(arguments);
    var callback = null;
    var silent = false;
    if (typeof assign[assign.length - 1] === 'function') {
      callback = assign[assign.length - 1];
      assign = assign.slice(0, assign.length - 1);
    }
    if (typeof assign[0] === 'boolean') {
      silent = assign.shift();
    }

    this.last(function(err, locals) {
      if (!silent && err !== undefined && err !== null) {
        throw err;
      }
      if (callback) {
        var args = [];
        assign.forEach(function(a) {
          args.push(depget(locals, a));
        });
        callback.apply(this, args);
      }
    });
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
  },
  toPromise: function() {
    var assign = arguments.length === 0 ? 'args.0' : arguments[0];
    var this_node = this;
    return new Promise(function(resolve, reject) {
      this_node.last(function(err, locals) {
        if (err) {
          reject(err);
        } else {
          resolve(depget(locals, assign));
        }
      });
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
