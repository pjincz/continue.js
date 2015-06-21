/* continue.js -- A very easy and clean async flow controller
 *
 * Copyright (C) 2015 Chizhong Jin
 * All rights reserved.
 *
 * This software may be modified and distributed under the terms
 * of the BSD license.  See the LICENSE file for details.
 */

'use strict';

var func_length_n = function(n, func) {
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
    case 10: return function(a, b, c, d, e, f, g, h, i, j) {return func(arguments)};
    case 11: return function(a, b, c, d, e, f, g, h, i, j, k) {return func(arguments)};
    case 12: return function(a, b, c, d, e, f, g, h, i, j, k, l) {return func(arguments)};
    case 13: return function(a, b, c, d, e, f, g, h, i, j, k, l, m) {return func(arguments)};
    case 14: return function(a, b, c, d, e, f, g, h, i, j, k, l, m, n) {return func(arguments)};
    case 15: return function(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o) {return func(arguments)};
    case 16: return function(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p) {return func(arguments)};
    case 17: return function(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q) {return func(arguments)};
    case 18: return function(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r) {return func(arguments)};
    case 19: return function(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s) {return func(arguments)};
    case 20: return function(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t) {return func(arguments)};
    default: return function(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u) {return func(arguments)};
  }
};

var proto_C = {
  __proto__: Function,
  _c_call: function(args) {
    this.args = args;
    this.value = args[0];
    this.err = null;
    this._c_next.go(this);
  },
  _c_err: function(err) {
    this.err = err;
    this.args = {};
    this.value = null;
    this._c_next.go_err(this);
  },
  _c_invoke: function() {
    if (this.err) {
      this._c_next.go_err(this);
    } else {
      this._c_next.go(this);
    }
  },
  assigner: function() {
    var assign_vars = arguments;
    var c = this;
    var func = function(args) {
      c.err = null;
      c.args = args;
      c.value = args[0];
      for (var i = 0; i < assign_vars.length; ++i) {
        if (assign_vars[i] !== null) {
          c[assign_vars[i]] = args[i];
        }
      }
      c._c_invoke();
    };
    return func_length_n(arguments.length, func);
  },
  assigner2: function() {
    var assign_vars = arguments;
    var c = this;
    var func = function(args) {
      c.err = null;
      c.args = args;
      c.value = args[0];
      for (var i = 0; i < assign_vars.length / 2; ++i) {
        if (assign_vars[i * 2] !== null && assign_vars[i * 2 + 1] !== null) {
          assign_vars[i * 2][assign_vars[i * 2 + 1]] = args[i];
        }
      }
      c._c_invoke();
    };
    return func_length_n(arguments.length / 2, func);
  }
};

var C = function() {
  var c = function() {
    c._c_call(arguments);
  };
  c.__proto__ = proto_C;
  c.args = {};
  c.value = c.args[0];
  c.err = null;

  return c;
};

var N;
var proto_N = {
  __proto__: Function,
  genNext: function() {
    this.next = N();
    this.next.first = this.first;
    return this.next;
  },
  go: function(c) {
    c._c_next = this.next;
    if (this.kind === 'then') {
      try {
        this.func(c);
      } 
      catch (err) {
        c._c_err(err);
      }
    } else if (this.kind === 'err') {
      this.next.go(c);
    } else if (this.kind === 'end') {
      if (this.func) {
        this.func(null, c);
      }
    }
  },
  go_err: function(c) {
    c._c_next = this.next;
    if (this.kind === 'then') {
      this.next.go_err(c);
    } else if (this.kind === 'err') {
      try {
        this.func.length == 2 ? this.func(c.err, c) : this.func(c);
      }
      catch (err2) {
        c._c_err(err2);
      }
    } else if (this.kind === 'end') {
      if (this.func) {
        this.func(c.err, c);
      } else {
        throw c.err;
      }
    }
  },
  then: function(func) {
    this.func = func;
    this.kind = 'then';
    return this.genNext();
  },
  err: function(func) {
    this.func = func;
    this.kind = 'err';
    return this.genNext();
  },
  end: function(func) {
    var c = C();

    this.func = func;
    this.kind = 'end';
    this.first.go(c);
  }
};

// alias
proto_N.done = proto_N.end;

N = function() {
  var n = function(func) {
    return func.length == 2 ? n.err(func) : n.then(func);
  };
  n.__proto__ = proto_N;
  return n;
};

var S = function(func) {
  var n = N();
  n.first = n;
  return n(func);
};

S.then = function(func) {
  var n = N();
  n.first = n;
  return n(func);
};

module.exports = S;
