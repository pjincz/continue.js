var N;

var proto_N = {
  genNext: function() {
    this.next = N();
    this.next.first = this.first;
    return this.next;
  },
  go: function(c) {
    c.next = this.next;
    if (this.kind == 'then') {
      try {
        this.func(c);
      } 
      catch (err) {
        c.err = err;
        c.args = {};
        c.value = null;
        this.next.go_err(c);
      }
    } else if (this.kind == 'err') {
      this.next.go(c);
    }
  },
  go_err: function(c) {
    c.next = this.next;
    if (this.kind == 'then') {
      this.next.go_err(c);
    } else if (this.kind == 'err') {
      try {
        this.func(c);
      }
      catch (err2) {
        c.err = err2;
        c.args = {};
        c.value = null;
        this.next.go_err(c);
      }
    } else if (this.kind == 'done') {
      throw err;
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
  end: function() {
    var c = function() {
      c.args = arguments;
      c.value = c.args[0];
      c.err = null;
      c.next.go(c);
    };
    c.args = {};
    c.value = c.args[0];
    c.err = null;

    this.kind = 'done';
    this.first.go(c);
  }
};

N = function() {
  var n = function(func) {
    return n.then(func);
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
