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
  it('pass value by attr', function (done) {
    S(function (c) {
      c.x = 123;
      c();
    })(function (c) {
      assert.equal(c.x, 123);
      c();
    }).end(done);
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
    S(function (c) {
      mock_func2('test', 1234, c.assigner2(x, 'x', 'y'));
    })(function (c) {
      assert.equal(x.x, 'test');
      assert.equal(x.y, 1234);
      c();
    }).end(done);
  });
  it('test null_or_err', function (done) {
    S(function (c) {
      mock_func(null, c.null_or_err());
    })(function (err, c) {
      throw 'never over here';
    })(function (c) {
      mock_func('test', c.null_or_err());
    })(function (c) {
      throw 'never over here';
    })(function (err, c) {
      assert.equal(err, 'test');
      c();
    }).end(done);
  });
});
