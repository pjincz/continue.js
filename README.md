continue.js
===========

A very easy and clean async flow controller

Why
---

I am a newbie of node.js, I try many of sync flow controller.

Include Promise.js, chunks.js, then.js, and more...

All of them are too complex and hard to understand and maintain working flow.

Parts of them are too complex, such as too many nesting...

Parts of them are over design, and hard to use...

In other words, we need a simpler and clean one!!!

Design objective
----------------

1. Most case can be done in 1 level nesting

2. Instinctive

Design defect
-------------

S....end must matched. Otherwise, actions in continue.js will not invoked.

Each block each path must end with continue action. Otherwise, actions chains will break.

But, I think they are not big problems, because of if you forget it, program will not work correctly.

Install
-------

    npm install 'git+https://github.com/jinchizhong/continue.js'

Usage
-----

### Basic

    S = require('continue');

    # normal format
    S.then(function (c) {
      console.log('hello');
      setTimeout(c, 1000);
    }).then(function(c) {
      console.log('world');
      setTimeout(c, 1000);
    }).then(function(c) {
      console.log('!!!');
      c();
    }).end();

    # or short format
    S(function (c) {
      console.log('hello');
      setTimeout(c, 1000);
    })(function (c) {
      console.log('world');
      setTimeout(c, 1000);
    })(function (c) {
      console.log('!!!');
      c();
    }).end();

### Start Node

continue.js start will `Start Node`. So, I always name it `S`.
You have 2 format to begin your continue.js

    # normal format
    S.then(function (c) {
        ....
    })

    # short format
    S(function (c) {
        ....
    })

They are ipentity, you can use one of them, or mixed.

### Intermediate Node

After Start Node, continue.js will run `Intermediate Node` one by one.

There are also 2 formats

    # normal format
    }).then(function (c) {

    # short format
    })(function (c) {

### End Node

`End Node` must be the last block, and necessary. If you lack the `End Node`, continue.js will not start at all.

    }).end();

    # for some reason, I defined an alias for end. You can use this too, if you like `done` more then `end`
    }).done();

### Transfer Action

When you transfer from one block to another block, `Transfer Action` is required.
Unlike promise.js or other libraries. If you lack `Transfer Action`, continue.js will breaked.
This is not a bug. I consider this for a long time, If keep `Auto Transfer` feature, 
It will bring lots' of chaos and complex, not only in library codes, but also in working codes.
It will let your code nesting level exploded.

So, I give `Auto Transfer` at least. As a result, each block and Each path in block have to have a 
`Transfer Action` in the end.

You can invoke `Transfer Action` is 3 ways:

    #1 call `c()` directly
    })(function (c) {
      console.log('hello');
      c();
    })(function (c) {
      ....

    #2 pass `c` to other function as callback function
    })(function (c) {
      setTimeout(c, 1000);  // this block will be sleep 1s, then go to next block
    })(function (c) {
      ....

    #3 throw a exception
    })(function (c) {
      throw 'test';         // for more details, see `Error flow` below
    })(function (c) {
      ....

### Arguments in `c()`

continue.js run blocks one by one. For this, you can get arguments from the last block callback.
You can access `c.args` for all arguments from last block, or `c.value` for first arguments from last block.

    $(function (c) {
      fs.readFile('xxx.txt', c);    // callback(err, data)
    })(function (c) {
      if (c.args[0]) {
        console.log('error: ' + c.args[0]); // c.args[0] is `err`
      } else {
        console.log('data: ' + c.args[1]);  // c.args[1] is `data`
      }
      // c.value is `err`
      c();
    }).end();

### Through Blocks Variable

If you want to share variables between blocks, A easiest way is set the variable to `c`.

    $(function (c) {
      c.server = app.listen(3000, c);
    })(function (c) {
      console.log('Express.js listen on http://%s:%s', c.server.address().address, c.server.address().port);
      c();
    }).end();

### Exception work flow


