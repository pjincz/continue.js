var proto_C = {
  _c_call: function(args) {
    this.args = args;
    this.value = args[0];
    this.err = null;
    this.next.go(this);
  },
  _c_err: function(err) {
    this.err = err;
    this.args = {};
    this.value = null;
    this.next.go_err(this);
  },
  assigner: function() {
    var assign_vars = arguments;
    var c = this;
    return function() {
      for (var i = 0; i < assign_vars.length; ++i) {
        c[assign_vars[i]] = arguments[i];
      }
      c._c_call(arguments);
    };
  },
  assigner2: function() {
    var assign_vars = arguments;
    var c = this;
    return function() {
      x = assign_vars[0];
      for (var i = 1; i < assign_vars.length; ++i) {
        x[assign_vars[i]] = arguments[i - 1];
      }
      c._c_call(arguments);
    };
  },
  null_or_err: function() {
    var c = this;
    return function(err) {
      if (err) {
        c._c_err(err);
      } else {
        c._c_call({});
      }
    };
  },
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
  genNext: function() {
    this.next = N();
    this.next.first = this.first;
    return this.next;
  },
  go: function(c) {
    c.next = this.next;
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
    c.next = this.next;
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
        throw err;
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


/*
S(function(c) {
  console.log(c.args);
  setTimeout(c, 500);
})(function(c) {
  console.log(c.args);
  c(123);
})(function(c) {
  console.log(c.args);
  throw 'show in next err capture';
})(function(c) {
  console.log('never show');
}).err(function(c) {
  console.log(c.err);
  c.v = 'pass by property';
  c();
})(function(c) {
  console.log(c.v);
  c();
}).end();
*/
