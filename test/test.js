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
  it('C(func)(func)(func)', function (done) {
    C(function (c) {
      c(123, 234);
    })(function (c, locals) {
      assert.equal(locals.args[0], 123);
      assert.equal(locals.args[1], 234);
      c();
    }).done(done);
  });
  it('C.then(func).then(func).then(func)', function (done) {
    C.then(function (c) {
      c(123, 234);
    }).then(function (c, locals) {
      assert.equal(locals.args[0], 123);
      assert.equal(locals.args[1], 234);
      c();
    }).done(done);
  });
  it('call by apply', function () {
    C(function (c) {
      c.apply(this, {});
    }).end();
  });
  it('pass value by attr', function (done) {
    C(function (c, locals) {
      locals.x = 123;
      c();
    })(function (c, locals) {
      assert.equal(locals.x, 123);
      c();
    }).done(done);
  });
  it('exception', function () {
    try {
      C(function (c) {
        throw 'test';
      }).end();
    }
    catch (err) {
      assert.equal(err, 'test');
    }
  });
  it('next name conflict', function () {
    C(function (c) {
      c.next = 123;
      c();
    }).end();
  });
  it('sync', function () {
    C(function (c, locals) {
      locals.x = 123;
      c();
    })(function (c, locals) {
      assert.equal(locals.x, 123);
      c();
    }).end();
  });
  it('async', function (done) {
    C(function (c) {
      setTimeout(c, 10);
    })(function (c) {
      assert.equal(c.value, undefined);
      c();
    }).done(done);
  });
  it('exception', function (done) {
    C(function (c) {
      throw 'test';
    })(function (c) {
      throw 'should not exec over';
    })(function (err, c, locals) {
      assert.equal(err, 'test');
      c();
    })(function (c, locals) {
      locals.x = 123;
      c();
    }).done(function(err, locals) {
      assert(!err);
      assert.equal(locals.x, 123);
      done();
    });
  });
  it('exception pass to done', function (done) {
    C(function (c) {
      throw 'test';
    })(function (c) {
      throw 'should not exec over';
    }).done(function (err) {
      assert.equal(err, 'test');
      done();
    });
  });
  it('test end assign', function (done) {
    var func = function(v) {
      assert.equal(v, 'hello');
      done();
    };
    C(function (c, locals) {
      locals.x = 'hello';
      c();
    }).end('x', func);
  });
  it('test end assign 2', function (done) {
    var func = function(err) {
      assert.equal(err, 'an error');
      done();
    };
    C(function (c) {
      throw 'an error';
    }).end(true, 'err', func);
  });
  it('alias .err(err, c)', function (done) {
    C(function (c) {
      throw 'test';
    })(function (err, c, locals) {
      assert.equal(err, 'test');
      assert.equal(locals.err, undefined);
      c();
    }).done(done);
  });
  it('alias (err, c)', function (done) {
    C(function (c) {
      throw 'test';
    })(function (err, c, locals) {
      assert.equal(err, 'test');
      assert.equal(locals.err, undefined);
      c();
    }).done(done);
  });
  it('test assign', function (done) {
    C(function (c) {
      mock_func2('test', 1234, c.assign('x', 'y'));
    })(function (c, locals) {
      assert.equal(locals.x, 'test');
      assert.equal(locals.y, 1234);
      c();
    }).done(done);
  });
  it('test assign2', function (done) {
    var x = {};
    var y = {};
    C(function (c) {
      mock_func2('test', 1234, c.assign2(x, 'x', y, 'y'));
    })(function (c) {
      assert.equal(x.x, 'test');
      assert.equal(y.y, 1234);
      c();
    }).done(done);
  });
  it('change err by assign', function (done) {
    var x = {};
    C(function (c, locals) {
      mock_func2('error', 1234, c.assign2(locals, 'err', x, 'value'));
    })(function (c) {
      throw 'never over here';
    })(function (err, c, locals) {
      assert.equal(err, 'error');
      assert.equal(x.value, 1234);
      c();
    }).done(done);
  });
  it('assign ignore null', function (done) {
    C(function (c) {
      mock_func(123, c.assign(null));
    })(function (c) {
      mock_func(123, c.assign2(null, null));
    }).done(done);
  });
  it('parameter number simulate', function (done) {
    C(function (c) {
      assert.equal(c.assign().length, 0);
      assert.equal(c.assign(null).length, 1);
      assert.equal(c.assign(null, null).length, 2);
      assert.equal(c.assign(null, null, null).length, 3);
      assert.equal(c.assign(null, null, null, null).length, 4);
      assert.equal(c.assign(null, null, null, null, null).length, 5);
      assert.equal(c.assign(null, null, null, null, null, null).length, 6);
      assert.equal(c.assign(null, null, null, null, null, null, null).length, 7);
      assert.equal(c.assign(null, null, null, null, null, null, null, null).length, 8);
      assert.equal(c.assign(null, null, null, null, null, null, null, null, null).length, 9);
      assert.equal(c.assign(null, null, null, null, null, null, null, null, null, null).length, 10);
      assert.equal(c.assign(null, null, null, null, null, null, null, null, null, null, null).length, 11);
      assert.equal(c.assign(null, null, null, null, null, null, null, null, null, null, null, null).length, 12);
      assert.equal(c.assign(null, null, null, null, null, null, null, null, null, null, null, null, null).length, 13);
      assert.equal(c.assign(null, null, null, null, null, null, null, null, null, null, null, null, null, null).length, 14);
      assert.equal(c.assign(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null).length, 15);
      assert.equal(c.assign(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null).length, 16);
      assert.equal(c.assign(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null).length, 17);
      assert.equal(c.assign(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null).length, 18);
      assert.equal(c.assign(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null).length, 19);
      assert.equal(c.assign(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null).length, 20);
      c();
    }).done(done);
  });
  it('parameter number simulate 2', function (done) {
    C(function (c) {
      assert.equal(c.assign2().length, 0);
      assert.equal(c.assign2(null, null).length, 1);
      assert.equal(c.assign2(null, null, null, null).length, 2);
      assert.equal(c.assign2(null, null, null, null, null, null).length, 3);
      assert.equal(c.assign2(null, null, null, null, null, null, null, null).length, 4);
      assert.equal(c.assign2(null, null, null, null, null, null, null, null, null, null).length, 5);
      assert.equal(c.assign2(null, null, null, null, null, null, null, null, null, null, null, null).length, 6);
      assert.equal(c.assign2(null, null, null, null, null, null, null, null, null, null, null, null, null, null).length, 7);
      assert.equal(c.assign2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null).length, 8);
      assert.equal(c.assign2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null).length, 9);
      assert.equal(c.assign2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null).length, 10);
      assert.equal(c.assign2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null).length, 11);
      assert.equal(c.assign2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null).length, 12);
      assert.equal(c.assign2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null, null, null).length, 13);
      assert.equal(c.assign2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null, null, null, null, null
        ).length, 14);
      assert.equal(c.assign2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null).length, 15);
      assert.equal(c.assign2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null).length, 16);
      assert.equal(c.assign2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null).length, 17);
      assert.equal(c.assign2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null).length, 18);
      assert.equal(c.assign2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null).length, 19);
      assert.equal(c.assign2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null, null, null).length, 20);
      c();
    }).done(done);
  });
});
