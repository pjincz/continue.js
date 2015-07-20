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

var iter_wrap_func = function(k, v, func) {
  return function(c) {
    c.loopKey = k;
    func.apply(this, [c, k, v]);
  };
};

var iter_wrap = function(data) {
  var dt = typeof data;
  if (data === undefined || data === null) {
    return function() {};
  } else if (dt === 'object' && data.constructor === Array) {
    var i = 0;
    return function(func) {
      if (i < data.length) {
        var f = iter_wrap_func(i, data[i], func);
        ++i;
        return f;
      }
    };
  } else if (dt === 'object') {
    var keys = [];
    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        keys.push(key);
      }
    }
    var i = 0;
    return function(func) {
      if (i < keys.length) {
        var f = iter_wrap_func(keys[i], data[keys[i]], func);
        ++i;
        return f;
      }
    }
  } else if (dt === 'string') {
    var proxy = null;
    return function() {
      proxy = proxy || iter_wrap(this.get(data));
      return proxy.apply(this, arguments);
    }
  } else {
    throw new Error('cannot wrap type: ' + dt);
  }
};

var iter_wrap_funcs = function(funcs) {
  var i = 0;
  return function() {
    if (i < funcs.length) {
      return funcs[i++];
    }
  };
};

var C_proto = {
  __proto__: Function,
  constructor: function(node, prev_c) {
    var obj = function() {
      obj.invoke.apply(obj, arguments);
    };
    obj.__proto__ = C_proto;

    if (arguments.length === 2) {
      // C(node, prev_c)
      obj.node = node;
      obj.next = node.next;
      obj.ctx = prev_c.ctx;
      obj.err = prev_c.err;
      obj.args = prev_c.invoke_args;
      obj.opts = node.first.opts;
      obj.breaked = prev_c.break_self;
    } else {
      // C()
      obj.ctx = {};
      obj.args = {};
      obj.err = null;
    }
    return obj;
  },
  double_invoke_protect: function() {
    if (this.invoked) {
      throw new Error('continue.js: c() invoked double times');
    }
    this.invoked = true;
  },
  invoke: function() {
    this.catch_exception = false;
    this.double_invoke_protect();
    this.invoke_args = arguments;
    this.next.invoke(this);
  },
  get accept () {
    var c = this;
    var obj = function() {
      c.err = null;
      c.apply(c, arguments);
    };
    obj.__proto__ = this;
    return obj;
  },
  get reject () {
    var c = this;
    var obj = function(err) {
      c.err = err || new Error('UnknownError');
      c.apply(c, arguments);
    };
    obj.__proto__ = this;
    return obj;
  },
  get break () {
    var c = this;
    var obj;
    if (c.looping) {
      obj = function(err) {
        c.break_self = true;
        c.apply(c, arguments);
      };
    } else {
      obj = function(err) {
        var body = c;
        while (!body.hasOwnProperty('node')) {
          body = body.__proto__;
        }
        var node = body.node;
        while (node.next) {
          node = node.next;
        }
        body.next = node;
        c.break_self = true;
        c.apply(c, arguments);
      };
    }
    obj.__proto__ = this;
    return obj;
  },
  get: function(key) {
    if (key === undefined || key === null) {
      return key;
    }
    var v = this.ctx;
    if (key[0] === '$') {
      v = this;
      key = key.slice(1);
    }

    var ks = key.split('.');
    ks.forEach(function(s) {
      v = v[s];
      if (v === undefined) {
        return v;
      }
    });
    return v;
  },
  set: function(key, value) {
    if (key === undefined || key === null) {
      return;
    }
    var v = this.ctx;
    if (key.constructor === Array) {
      v = key[0];
      key = key[1];
    } else if (key[0] === '$') {
      v = this;
      key = key.slice(1);
    }

    var ss = key.split('.');
    for (var i = 0; i < ss.length - 1; ++i) {
      var s = ss[i];
      if (v[s] === undefined) {
        v[s] = {};
      }
      v = v[s];
    }
    var s = ss[ss.length - 1];
    if (s === '@') {
      s = this.loopKey;
      if (s === null || s === undefined) {
        throw new Error('cannot get `' + key + '`, not in loop or loopKey missing');
      }
    }
    v[s] = value;
  },
  assign: function() {
    var keys = arguments;
    var c = this;
    var func = function(args) {
      for (var i = 0; i < keys.length; ++i) {
        c.set(keys[i], args[i]);
      }
      c.apply(c, args);
    };
    var obj = func_length_n(keys.length, func);
    obj.__proto__ = this;
    return obj;
  }
};
var C = C_proto.constructor;
C.prototype = C_proto;

var Node_proto = {
  __proto__: Function,
  constructor: function() {
    var obj = function() {
      obj.invoke.apply(obj, arguments);
    };
    obj.__proto__ = Node_proto;
    return obj;
  },
  genNext: function() {
    this.next = Node_proto.constructor();
    this.next.first = this.first;
    return this.next;
  },
  invoke_callback: function(c, func) {
    if (func.length <= 1 || c.args.length === 0) {
      return func.apply(c.ctx, [c]);
    } else {
      var args = [c].concat(Array.prototype.slice.call(c.args));
      return func.apply(c.ctx, args);
    }
  },
  exception_protect: function(prev_c, func, c) {
    c = c || C(this, prev_c);
    if (this.first.opts.safe) {
      c.catch_exception = true;
      try {
        this.invoke_callback(c, func);
      } catch (err) {
        if (c.catch_exception) {
          c.err = err;
          c.invoke(err);
        } else {
          throw err;
        }
      }
    } else {
      this.invoke_callback(c, func);
    }
  },
  parallel_wrap: function(prev_c, limit, iter, args, catch_break) {
    var ncur = 0;
    var nspawn = 0;
    var err = null;
    var node = this;
    var breaked = false;
    var done_invoked = false;

    var spawn = function() {
      var c = C(node, prev_c);
      c.next = {invoke: next};
      c.looping = true;
      var block = iter.apply(c, args);
      if (block) {
        ncur++;
        nspawn++;
        node.exception_protect(prev_c, block, c);
        return true;
      } else {
        return false;
      }
    };

    var next = function(c) {
      ncur--;
      if (c.break_self) {
        breaked = true;
      }
      if (c.err) {
        err = c.err;
      }
      if (!err && !breaked) {
        spawn();
      }
      if (ncur === 0 && !done_invoked) {
        done_invoked = true;
        var c = C(node, prev_c);
        c.err = err;
        c.break_self = breaked;
        if (breaked && !catch_break) {
          c.break();
        } else {
          c();
        }
      }
    };

    while (ncur < limit && !err && !breaked) {
      if (!spawn()) {
        break;
      }
    }
    if (nspawn === 0) {
      // no task, so invoke chains will not work, have to done manually
      var c = C(this, prev_c);
      c.err = err;
      c();
    }
  },
  then: function(func) {
    var funcs = arguments;
    this.invoke = function(prev_c) {
      if (!prev_c.err) {
        if (funcs.length > 1) {
          this.parallel_wrap(prev_c, 999, iter_wrap_funcs(funcs), [], false);
        } else {
          this.exception_protect(prev_c, func);
        }
      } else {
        this.next.invoke(prev_c);
      }
    };
    return this.genNext();
  },
  fail: function(func) {
    this.invoke = function(prev_c) {
      if (prev_c.err) {
        this.exception_protect(prev_c, func);
      } else {
        this.next.invoke(prev_c);
      }
    };
    return this.genNext();
  },
  always: function(func) {
    this.invoke = function(prev_c) {
      this.exception_protect(prev_c, func);
    };
    return this.genNext();
  },
  for: function() {
    var args = Array.prototype.slice.call(arguments);
    var limit = 1;
    if (typeof args[0] === 'number') {
      limit = args.shift();
    }
    var iter = args.shift();
    if (typeof iter !== 'function') {
      iter = iter_wrap(iter);
    }

    this.invoke = function(prev_c) {
      this.parallel_wrap(prev_c, limit, iter, args, true);
    };

    return this.genNext();
  },
  last: function(func) {
    this.invoke = function(prev_c) {
      // do not protect exception in last node
      var c = C(this, prev_c);
      this.invoke_callback(c, func);
    };
    this.first.invoke(C());
  },
  end: function() {
    var assign = Array.prototype.slice.call(arguments);
    var callback = null;
    var noise = true;
    if (typeof assign[assign.length - 1] === 'function') {
      callback = assign[assign.length - 1];
      assign = assign.slice(0, assign.length - 1);
    }
    if (typeof assign[0] === 'boolean') {
      noise = assign.shift();
    }

    this.last(function(c) {
      if (noise && c.err) {
        throw c.err;
      }
      if (callback) {
        var args = [];
        assign.forEach(function(a) {
          args.push(c.get(a));
        });
        callback.apply(this, args);
      }
    });
  },
  stdend: function() {
    var assign = Array.prototype.slice.call(arguments);
    var callback = null;
    if (assign.length > 0 && typeof assign[assign.length - 1] === 'function') {
      callback = assign[assign.length - 1];
      assign = assign.slice(0, assign.length - 1);
    }
    if (!callback) {
      throw new Error('Missing callback function in stdend(), use .end() instead of');
    }

    this.last(function(c) {
      var args = [c.err];
      assign.forEach(function(a) {
        args.push(c.get(a));
      });
      callback.apply(this, args);
    });
  },
  toPromise: function() {
    var assign = arguments.length === 0 ? '$args.0' : arguments[0];
    var this_node = this;
    return new Promise(function(resolve, reject) {
      this_node.last(function(c) {
        if (c.err) {
          reject(c.err);
        } else {
          resolve(c.get(assign));
        }
      });
    });
  }
};
var Node = Node_proto.constructor;
Node.prototype = Node_proto;

var S = function() {
  var b = Node();
  b.opts = {};
  for (var i = 0; i < arguments.length; ++i) {
    b.opts[arguments[i]] = true;
  }
  b.first = b;
  return b;
};

module.exports = S;
