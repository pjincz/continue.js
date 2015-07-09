var assert = require('assert');
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
  }, 10);
};

describe('continue.js', function () {
  it('basic chain', function(done) {
    C().then(function(c) {
      setTimeout(c, 10);
    }).stdend(done);
  });
  it('safe', function() {
    C('safe').then(function(c, locals) {
      assert(locals.adv.safe);
      throw 'test';
    }).fail(function(err, c) {
      assert.equal(err, 'test');
      throw 'test2';
    }).fail(function(err, c) {
      assert.equal(err, 'test2');
      c();
    }).stdend();
  });
  it('unsafe', function() {
    assert.throws(function () {
      C().then(function(c) {
        assert.not(locals.adv.safe);
        throw 'test';
      }).stdend();
    });
  });
  it('unsafe 2', function() {
    assert.throws(function () {
      C().then(function(c) {
        c.reject();
      }).fail(function(err, c) {
        throw 'test';
      }).stdend();
    });
  });
  it('unsafe 3', function() {
    assert.throws(function () {
      C().then(function(c) {
        c();
      }).always(function(err, c, locals) {
        throw 'test';
      }).stdend();
    });
  });
  it('.then(c, locals, x, y)', function() {
    C().then(function(c) {
      c(123, 'hello');
    }).then(function(c, locals, x, y) {
      assert.equal(x, 123);
      assert.equal(y, 'hello');
      assert.equal(locals.err, null);
      assert.equal(locals.args[0], 123);
      assert.equal(locals.args[1], 'hello');
    }).stdend();
  });
  it('.fail(err, c, locals)', function() {
    C().then(function(c) {
      c.reject('test err');
    }).fail(function(err, c, locals) {
      assert.equal(err, 'test err');
      assert.equal(locals.err, null);
      assert.equal(locals.args[0], 'test err');
      assert.equal(locals.args[1], undefined);
    }).stdend();
  });
  it('.always', function() {
    var times = 0;
    C().then(function(c) {
      c.accept();
    }).always(function(err, c, locals) {
      assert.equal(err, null);
      ++times;
      c.reject();
    }).always(function(err, c, locals) {
      assert.notEqual(err, null);
      ++times;
      c();
    }).then(function(c, locals) {
      assert.equal(times, 2);
      c();
    }).stdend();
  });
  it('.last', function() {
    var x = 0;
    C().then(function(c) {
      c.accept();
    }).last(function(err, locals) {
      assert.equal(err, null);
      assert.equal(locals.err, null);
      x = 1;
    });
    assert.equal(x, 1);
  });
  it('.last 2', function() {
    var x = 0;
    C().then(function(c) {
      c.reject();
    }).last(function(err, locals) {
      assert.notEqual(err, null);
      assert.notEqual(locals.err, null);
      x = 1;
    });
    assert.equal(x, 1);
  });
  it('.end should throw', function() {
    assert.throws(function () {
      C().then(function(c) {
        c.reject();
      }).end();
    });
  });
  it('.end should throw 2', function() {
    assert.throws(function () {
      C().then(function(c) {
        c.reject();
      }).end(false);
    });
  });
  it('.end should not throw', function() {
    C().then(function(c) {
      c.reject();
    }).end(true);
  });
  it('.end assign', function() {
    C().then(function(c, locals) {
      locals.x = 1;
      locals.y = {z: 'y.z'};
      c();
    }).end('x', 'y.z', function(a, b) {
      assert.equal(a, 1);
      assert.equal(b, 'y.z');
    });
  });
  it('.stdend should not throw', function() {
    C().then(function(c) {
      c.reject();
    }).stdend();
  });
  it('.stdend assign', function() {
    C().then(function(c, locals) {
      locals.x = 1;
      locals.y = {z: 'y.z'};
      c.reject('test');
    }).stdend('x', 'y.z', function(err, a, b) {
      assert.equal(err, 'test');
      assert.equal(a, 1);
      assert.equal(b, 'y.z');
    });
  });
  it('.toPromise fullfil', function() {
    var p = C().then(function(c, locals) {
      c.accept(123);
    }).toPromise();
    p.then(function(v) {
      assert.equal(v, 123);
    });
  });
  it('.toPromise reject', function() {
    var p = C().then(function(c, locals) {
      c.reject('test');
    }).toPromise();
    p.then(function(v) {
      throw 'not over here';
    }, function(err) {
      assert.equal(err, 'test');
    });
  });
  it('c(...)', function() {
    C().then(function(c, locals) {
      c(123);
    }).always(function(err, c, locals) {
      assert.equal(err, null);
      assert.equal(locals.args[0], 123);
      locals.err = 'test error';
      c(234);
    }).always(function(err, c, locals) {
      assert.equal(err, 'test error');
      assert.equal(locals.args[0], 234);
      assert.equal(locals.err, null);
    }).stdend();
  });
  it('c.accept', function() {
    C().then(function(c, locals) {
      locals.err = 'test';
      c.accept(123);
    }).always(function(err, c, locals) {
      assert.equal(err, null);
      assert.equal(locals.args[0], 123);
      c();
    }).stdend();
  });
  it('c.reject', function() {
    C().then(function(c, locals) {
      c.reject('test');
    }).always(function(err, c, locals) {
      assert.equal(err, 'test');
      assert.equal(locals.args[0], 'test');
      c.reject();
    }).always(function(err, c, locals) {
      assert.notEqual(err, 'test');
      c();
    }).stdend();
  });
  it('c.break', function() {
    C().then(function(c, locals) {
      c.break('ohhhh');
    }).always(function(err, c, locals) {
      throw 'not over here';
    }).last(function(err, locals) {
      assert.equal(err, null);
      assert.equal(locals.args[0], 'ohhhh');
      assert(locals.adv.breaked);
    });
  });
  it('c.assign', function(done) {
    C().then(function(c, locals) {
      mock_callback(1, 'aa', c.assign('x', 'y.z'));
    }).always(function(err, c, locals) {
      assert.equal(err, null);
      assert.equal(locals.x, 1);
      assert.equal(locals.y.z, 'aa');
      c();
    }).stdend(done);
  });
  it('c.assign more then 10', function(done) {
    C().then(function(c, locals) {
      mock_callback(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 
            c.assign('a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12', 'a13'));
    }).always(function(err, c, locals) {
      assert.equal(locals.a13, 13);
      c();
    }).stdend(done);
  });
  it('c.assign simulate length', function() {
    C().then(function(c, locals) {
      var args = [];
      var args2 = [];
      for (var i = 0; i < 30; ++i) {
        assert.equal(c.assign.apply(this, args).length, i);
        assert.equal(c.assign2.apply(this, args2).length, i);
        args.push('a' + i);
        args2.push('a' + i);
        args2.push('b' + i);
      }
      c();
    }).stdend();
  });
  it('c.assign2', function(done) {
    var x = {};
    C().then(function(c, locals) {
      mock_callback(1, 'aa', c.assign2(locals, 'x', x, 'y.z'));
    }).always(function(err, c, locals) {
      assert.equal(err, null);
      assert.equal(locals.x, 1);
      assert.equal(x.y.z, 'aa');
      c();
    }).stdend(done);
  });
  it('c.locals', function(done) {
    C().then(function(c, locals) {
      assert.equal(c.locals, locals);
      c();
    }).stdend(done);
  });
  it('c.reject.assign', function(done) {
    C().then(function(c, locals) {
      c.reject.assign('err2')('test error');
    }).always(function(err, c, locals) {
      assert.equal(err, 'test error');
      assert.equal(locals.err2, 'test error');
      c();
    }).stdend(done);
  });
});
