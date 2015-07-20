var assert = require('assert');
var Promise = require('promise');
var C = require('../lib/continue.js');

describe('self test', function () {
  it('1 == 1', function () {
    assert.equal(1, 1);
  });
});

var mock_callback = function() {
  var callback = arguments[arguments.length - 1];
  var args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
  setTimeout(function() {
    callback.apply(this, args);
  }, 1);
};

var mock_callback_100 = function() {
  var callback = arguments[arguments.length - 1];
  var args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
  setTimeout(function() {
    callback.apply(this, args);
  }, 100);
};

var mock_promise = function(s, val) {
  return new Promise(function(fullfil, reject) {
    setTimeout(function() {
      if (s) {
        fullfil(val);
      } else {
        reject(val);
      }
    }, 1);
  });
};

describe('continue.js', function () {
  this.timeout(200);
  it('basic chain', function(done) {
    C().then(function(c) {
      setTimeout(c, 10);
    }).stdend(done);
  });
  it('safe', function(done) {
    C('safe').then(function(c) {
      assert(c.opts.safe);
      throw 'test';
    }).fail(function(c) {
      assert.equal(c.err, 'test');
      throw 'test2';
    }).fail(function(c) {
      assert.equal(c.err, 'test2');
      c.accept();
    }).stdend(done);
  });
  it('unsafe', function() {
    try {
      C().then(function(c) {
        assert(!c.opts.safe);
        throw 'test';
      }).end();
    } catch (err) {
      assert.equal(err, 'test');
    }
  });
  it('unsafe 2', function() {
    try {
      C().then(function(c) {
        c.reject();
      }).fail(function(c) {
        throw 'test';
      }).end();
    } catch (err) {
      assert.equal(err, 'test');
    }
  });
  it('unsafe 3', function() {
    try {
      C().then(function(c) {
        c();
      }).always(function(c) {
        throw 'test';
      }).end();
    } catch (err) {
      assert.equal(err, 'test');
    }
  });
  it('.then(c, x, y)', function(done) {
    C().then(function(c) {
      c(123, 'hello');
    }).then(function(c, x, y) {
      assert.equal(x, 123);
      assert.equal(y, 'hello');
      assert.equal(c.err, null);
      assert.equal(c.args[0], 123);
      assert.equal(c.args[1], 'hello');
      c();
    }).stdend(done);
  });
  it('.fail(c, x, y)', function(done) {
    C().fail(function(c) {
      throw 'do not over here';
    }).then(function(c) {
      c.reject(123, 'hello');
    }).fail(function(c, x, y) {
      assert.equal(x, 123);
      assert.equal(y, 'hello');
      assert.equal(c.err, 123);
      assert.equal(c.args[0], 123);
      assert.equal(c.args[1], 'hello');
      c.accept();
    }).stdend(done);
  });
  it('.always(c, x, y)', function(done) {
    C().then(function(c) {
      c(123, 'hello');
    }).always(function(c, x, y) {
      assert.equal(x, 123);
      assert.equal(y, 'hello');
      assert.equal(c.err, null);
      assert.equal(c.args[0], 123);
      assert.equal(c.args[1], 'hello');
      c();
    }).stdend(done);
  });
  it('.fail(c)', function(done) {
    C().then(function(c) {
      c.reject('test err');
    }).fail(function(c) {
      assert.equal(c.err, 'test err');
      assert.equal(c.args[0], 'test err');
      assert.equal(c.args[1], undefined);
      c.accept();
    }).stdend(done);
  });
  it('.always', function(done) {
    var times = 0;
    C().then(function(c) {
      c.accept();
    }).always(function(c) {
      assert.equal(c.err, null);
      ++times;
      c.reject();
    }).always(function(c) {
      assert.notEqual(c.err, null);
      ++times;
      c.accept();
    }).then(function(c) {
      assert.equal(times, 2);
      c();
    }).stdend(done);
  });
  it('.last', function(done) {
    var x = 0;
    C().then(function(c) {
      c.accept();
    }).last(function(c) {
      assert.equal(c.err, null);
      x = 1;
    });
    assert.equal(x, 1);
    done();
  });
  it('.last 2', function(done) {
    var x = 0;
    C().then(function(c) {
      c.reject();
    }).last(function(c) {
      assert.notEqual(c.err, null);
      x = 1;
    });
    assert.equal(x, 1);
    done();
  });
  it('.end should throw', function() {
    try {
      C().then(function(c) {
        c.reject();
      }).end();
    } catch (err) {
      assert(err instanceof Error);
    }
  });
  it('.end should throw 2', function() {
    try {
      C().then(function(c) {
        c.reject();
      }).end(true);
    } catch (err) {
      assert(err instanceof Error);
    }
  });
  it('.end should not throw', function() {
    C().then(function(c) {
      c.reject();
    }).end(false);
  });
  it('.end assign', function(done) {
    C().then(function(c) {
      this.x = 1;
      this.y = {z: 'y.z'};
      c();
    }).end('x', 'y.z', function(a, b) {
      assert.equal(a, 1);
      assert.equal(b, 'y.z');
      done();
    });
  });
  it('.end assign $err', function(done) {
    C().then(function(c) {
      c.reject('test err');
    }).end(false, '$err', function(err) {
      assert.equal(err, 'test err');
      done();
    });
  });
  it('.stdend do not allow missing callback', function() {
    try {
      C().then(function(c) {
        c.reject();
      }).stdend();
    } catch (err) {
      assert(err instanceof Error);
    }
  });
  it('.stdend should not throw', function() {
    C().then(function(c) {
      c.reject();
    }).stdend(function(){});
  });
  it('.stdend assign', function(done) {
    C().then(function(c) {
      this.x = 1;
      this.y = {z: 'y.z'};
      c.reject('test');
    }).stdend('x', 'y.z', function(err, a, b) {
      assert.equal(err, 'test');
      assert.equal(a, 1);
      assert.equal(b, 'y.z');
      done();
    });
  });
  it('.toPromise fullfil', function(done) {
    var p = C().then(function(c) {
      c.accept(123);
    }).toPromise();
    p.then(function(v) {
      assert.equal(v, 123);
      done();
    });
  });
  it('.toPromise reject', function(done) {
    var p = C().then(function(c) {
      c.reject('test');
    }).toPromise();
    p.then(function(v) {
      throw 'not over here';
    }, function(err) {
      assert.equal(err, 'test');
      done();
    });
  });
  it('c(...)', function(done) {
    C().then(function(c) {
      c(123);
    }).always(function(c) {
      assert.equal(c.err, null);
      assert.equal(c.args[0], 123);
      c.err = 'test error';
      c(234);
    }).always(function(c) {
      assert.equal(c.err, 'test error');
      assert.equal(c.args[0], 234);
      c.accept();
    }).stdend(done);
  });
  it('c.accept', function(done) {
    C().then(function(c) {
      this.err = 'test';
      c.accept(123);
    }).always(function(c) {
      assert.equal(c.err, null);
      assert.equal(c.args[0], 123);
      c();
    }).stdend(done);
  });
  it('c.reject', function(done) {
    C().then(function(c) {
      c.reject('test');
    }).always(function(c) {
      assert.equal(c.err, 'test');
      assert.equal(c.args[0], 'test');
      c.reject();
    }).always(function(c) {
      assert.notEqual(c.err, 'test');
      c.accept();
    }).stdend(done);
  });
  it('c.break', function(done) {
    C().then(function(c) {
      c.break('ohhhh');
    }).always(function(c) {
      throw 'not over here';
    }).last(function(c) {
      assert.equal(c.err, null);
      assert.equal(c.args[0], 'ohhhh');
      assert(c.breaked);
      done();
    });
  });
  it('c.assign', function(done) {
    C().then(function(c) {
      this.my = {};
      mock_callback(1, 'aa', 'abc', c.assign('x', 'y.z', [this.my, 'x']));
    }).always(function(c) {
      assert.equal(c.err, null);
      assert.equal(this.x, 1);
      assert.equal(this.y.z, 'aa');
      assert.equal(this.my.x, 'abc');
      c();
    }).stdend(done);
  });
  it('c.assign $err', function(done) {
    C().then(function(c) {
      mock_callback('test err', c.assign('$err'));
    }).always(function(c) {
      assert.equal(c.err, 'test err');
      c.accept();
    }).stdend(done);
  });
  it('c.assign more then 10', function(done) {
    C().then(function(c) {
      mock_callback(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 
            c.assign('a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12', 'a13'));
    }).always(function(c) {
      assert.equal(this.a13, 13);
      c();
    }).stdend(done);
  });
  it('c.assign simulate length', function(done) {
    C().then(function(c) {
      var args = [];
      for (var i = 0; i < 30; ++i) {
        assert.equal(c.assign.apply(this, args).length, i);
        args.push('a' + i);
      }
      c();
    }).stdend(done);
  });
  it('c.ctx', function(done) {
    C().then(function(c) {
      assert.equal(c.ctx, this);
      c();
    }).stdend(done);
  });
  it('c.reject.assign', function(done) {
    C().then(function(c) {
      c.reject.assign('err2')('test error');
    }).always(function(c) {
      assert.equal(c.err, 'test error');
      assert.equal(this.err2, 'test error');
      c.accept();
    }).stdend(done);
  });
  it('promise', function(done) {
    C().then(function(c) {
      mock_promise(true, 123).then(c.accept, c.reject);
    }).then(function(c, value) {
      assert.equal(value, 123);
      assert.equal(c.args[0], 123);
      mock_promise(false, 234).then(c.accept, c.reject);
    }).fail(function(c) {
      assert.equal(c.err, 234);
      assert.equal(c.args[0], 234);
      mock_promise(true, 333).then(c.accept, c.reject);
    }).always(function(c) {
      assert.equal(c.err, null);
      assert.equal(c.args[0], 333);
      mock_promise(true).then(c.accept, c.reject);
    }).stdend(done);
  });
  it('do not call c() twice', function() {
    try {
      C().then(function(c) {
        c();
        c();
      }).end();
    } catch (err) {
      assert(err instanceof Error);
    }
  });
  it('.for array', function(done) {
    var x = '';
    var invoked = false;
    C().for(['a', 'b', 'c'], function(c, i, v) {
      assert.equal(typeof i, 'number');
      x += v;
      c();
    }).then(function(c) {
      assert(x, 'abc');
      c();
    }).stdend(function() {
      if (invoked) throw new Error('aaa');
      invoked = true;
      done();
    });
  });
  it('.for string', function(done) {
    var x = '';
    C().then(function(c) {
      this.xxx = ['a', 'b', 'c'];
      c();
    }).for(10, 'xxx', function(c, i, v) {
      assert.equal(typeof i, 'number');
      x += v;
      c();
    }).then(function(c) {
      assert(x, 'abc');
      c();
    }).stdend(done);
  });
  it('.for object', function(done) {
    var ks = '';
    var vs = '';
    C().then(function(c) {
      this.x = {a: 1, b: 2, c: 3};
      c();
    }).for('x', function(c, k, v) {
      assert.equal(typeof k, 'string');
      ks += k;
      vs += v;
      c();
    }).then(function(c) {
      assert(ks, 'abc');
      assert(vs, '123');
      c();
    }).stdend(done);
  });
  it('.for break', function(done) {
    C().for(['a', 'b', 'c'], function(c, i, v) {
      this.times = this.times ? this.times + 1 : 1;
      c.break();
    }).always(function(c) {
      assert.equal(c.err, null);
      assert.equal(this.times, 1);
      assert.equal(c.breaked, true);
      this.xxx = 1;
      c();
    }).last(function(c) {
      assert(!c.breaked);
      assert.equal(this.xxx, 1);
      done();
    });
  });
  it('.for parallel', function(done) {
    // if parallel succeed, this case will case 1000 ms
    // else it will be timeout
    C().for(10, ['a', 'b', 'c', 'd', 'e'], function(c, i, v) {
      mock_callback_100(v, c.assign('x.' + i));
    }).then(function(c) {
      assert.equal(this.x[0], 'a');
      assert.equal(this.x[4], 'e');
      c();
    }).stdend(done);
  });
  it('.for empty', function(done) {
    C().for([], function(c, i, v) {
      throw 'not over here';
    }).stdend(done);
  });
  it('.then parallel', function(done) {
    var times = 0;
    C().then(function(c) {
      c(123);
    }).then(function(c, x) {
      assert.equal(x, 123);
      ++times;
      setTimeout(c, 100);
    }, function(c, x) {
      assert.equal(x, 123);
      ++times;
      setTimeout(c, 100);
    }, function(c, x) {
      assert.equal(x, 123);
      ++times;
      setTimeout(c, 100);
    }).then(function(c) {
      assert.equal(times, 3);
      c();
    }).stdend(done);
  });
  it('.then parallel break', function(done) {
    var times = 0;
    C().then(function(c) {
      setTimeout(function() {
        ++times;
        c.break();
      }, 50);
    }, function(c) {
      setTimeout(function() {
        ++times;
        c();
      }, 100);
    }).then(function(c) {
      throw 'will not over here'
    }).stdend(done);
  });
});
