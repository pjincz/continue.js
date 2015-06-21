var assert = require('assert');
var S = require('../lib/continue.js');

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
  it('S(func)(func)(func)', function (done) {
    S(function (c) {
      c(123, 234);
    })(function (c) {
      assert.equal(c.value, 123);
      assert.equal(c.args[1], 234);
      c();
    }).end(done);
  });
  it('S.then(func).then(func).then(func)', function (done) {
    S.then(function (c) {
      c(123, 234);
    }).then(function (c) {
      assert.equal(c.value, 123);
      assert.equal(c.args[1], 234);
      c();
    }).end(done);
  });
  it('call by apply', function () {
    S(function (c) {
      c.apply(this, {});
    }).end();
  });
  it('pass value by attr', function (done) {
    S(function (c) {
      c.x = 123;
      c();
    })(function (c) {
      assert.equal(c.x, 123);
      c();
    }).end(done);
  });
  it('exception', function () {
    try {
      S(function (c) {
        throw 'test';
      }).end();
    }
    catch (err) {
      assert.equal(err, 'test');
    }
  });
  it('sync', function () {
    S(function (c) {
      c.x = 123;
      c();
    })(function (c) {
      assert.equal(c.x, 123);
      c();
    }).end();
  });
  it('async', function (done) {
    S(function (c) {
      setTimeout(c, 10);
    })(function (c) {
      assert.equal(c.value, undefined);
      c();
    }).end(done);
  });
  it('exception', function (done) {
    S(function (c) {
      throw 'test';
    })(function (c) {
      throw 'should not exec over';
    }).err(function (c) {
      assert.equal(c.err, 'test');
      c();
    })(function (c) {
      c.x = 123;
      c();
    }).end(function(err, c) {
      assert.equal(c.x, 123);
      done();
    });
  });
  it('exception pass to end', function (done) {
    S(function (c) {
      throw 'test';
    })(function (c) {
      throw 'should not exec over';
    }).end(function (err) {
      assert.equal(err, 'test');
      done();
    });
  });
  it('alias .err(err, c)', function (done) {
    S(function (c) {
      throw 'test';
    }).err(function (err, c) {
      assert.equal(err, 'test');
      assert.equal(c.err, 'test');
      c();
    }).end(done);
  });
  it('alias (err, c)', function (done) {
    S(function (c) {
      throw 'test';
    })(function (err, c) {
      assert.equal(err, 'test');
      assert.equal(c.err, 'test');
      c();
    }).end(done);
  });
  it('alias done()', function (done) {
    S(function (c) {
      throw 'test';
    })(function (err, c) {
      assert.equal(err, 'test');
      assert.equal(c.err, 'test');
      c();
    }).done(done);
  });
  it('test assigner', function (done) {
    S(function (c) {
      mock_func2('test', 1234, c.assigner('x', 'y'));
    })(function (c) {
      assert.equal(c.x, 'test');
      assert.equal(c.y, 1234);
      c();
    }).end(done);
  });
  it('test assigner2', function (done) {
    var x = {};
    var y = {};
    S(function (c) {
      mock_func2('test', 1234, c.assigner2(x, 'x', y, 'y'));
    })(function (c) {
      assert.equal(x.x, 'test');
      assert.equal(y.y, 1234);
      c();
    }).end(done);
  });
  it('change err by assigner', function (done) {
    var x = {};
    S(function (c) {
      mock_func2('error', 1234, c.assigner2(c, 'err', x, 'value'));
    })(function (c) {
      throw 'never over here';
    })(function (err, c) {
      assert.equal(c.err, 'error');
      assert.equal(x.value, 1234);
      c();
    }).end(done);
  });
  it('assigner ignore null', function (done) {
    S(function (c) {
      mock_func(123, c.assigner(null));
    })(function (c) {
      mock_func(123, c.assigner2(null, null));
    }).end(done);
  });
  it('parameter number simulate', function (done) {
    S(function (c) {
      assert.equal(c.assigner().length, 0);
      assert.equal(c.assigner(null).length, 1);
      assert.equal(c.assigner(null, null).length, 2);
      assert.equal(c.assigner(null, null, null).length, 3);
      assert.equal(c.assigner(null, null, null, null).length, 4);
      assert.equal(c.assigner(null, null, null, null, null).length, 5);
      assert.equal(c.assigner(null, null, null, null, null, null).length, 6);
      assert.equal(c.assigner(null, null, null, null, null, null, null).length, 7);
      assert.equal(c.assigner(null, null, null, null, null, null, null, null).length, 8);
      assert.equal(c.assigner(null, null, null, null, null, null, null, null, null).length, 9);
      assert.equal(c.assigner(null, null, null, null, null, null, null, null, null, null).length, 10);
      assert.equal(c.assigner(null, null, null, null, null, null, null, null, null, null, null).length, 11);
      assert.equal(c.assigner(null, null, null, null, null, null, null, null, null, null, null, null).length, 12);
      assert.equal(c.assigner(null, null, null, null, null, null, null, null, null, null, null, null, null).length, 13);
      assert.equal(c.assigner(null, null, null, null, null, null, null, null, null, null, null, null, null, null).length, 14);
      assert.equal(c.assigner(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null).length, 15);
      assert.equal(c.assigner(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null).length, 16);
      assert.equal(c.assigner(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null).length, 17);
      assert.equal(c.assigner(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null).length, 18);
      assert.equal(c.assigner(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null).length, 19);
      assert.equal(c.assigner(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null).length, 20);
      c();
    }).end(done);
  });
  it('parameter number simulate 2', function (done) {
    S(function (c) {
      assert.equal(c.assigner2().length, 0);
      assert.equal(c.assigner2(null, null).length, 1);
      assert.equal(c.assigner2(null, null, null, null).length, 2);
      assert.equal(c.assigner2(null, null, null, null, null, null).length, 3);
      assert.equal(c.assigner2(null, null, null, null, null, null, null, null).length, 4);
      assert.equal(c.assigner2(null, null, null, null, null, null, null, null, null, null).length, 5);
      assert.equal(c.assigner2(null, null, null, null, null, null, null, null, null, null, null, null).length, 6);
      assert.equal(c.assigner2(null, null, null, null, null, null, null, null, null, null, null, null, null, null).length, 7);
      assert.equal(c.assigner2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null).length, 8);
      assert.equal(c.assigner2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null).length, 9);
      assert.equal(c.assigner2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null).length, 10);
      assert.equal(c.assigner2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null).length, 11);
      assert.equal(c.assigner2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null).length, 12);
      assert.equal(c.assigner2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null, null, null).length, 13);
      assert.equal(c.assigner2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null, null, null, null, null
        ).length, 14);
      assert.equal(c.assigner2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null).length, 15);
      assert.equal(c.assigner2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null).length, 16);
      assert.equal(c.assigner2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null).length, 17);
      assert.equal(c.assigner2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null).length, 18);
      assert.equal(c.assigner2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null).length, 19);
      assert.equal(c.assigner2(null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null, null, null, null, null
        , null, null, null, null, null, null, null, null, null, null, null, null).length, 20);
      c();
    }).end(done);
  });
});
