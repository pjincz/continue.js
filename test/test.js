var assert = require('assert');
var C = require('../lib/continue.js');

describe('self test', function () {
  it('1 == 1', function () {
    assert.equal(1, 1);
  });
});

var mock_func = function(r, cb) {
  setTimeout(function() {
    cb(r);
  }, 10);
};

var mock_func2 = function(r1, r2, cb) {
  setTimeout(function() {
    cb(r1, r2);
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
});
