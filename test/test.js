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
});
