continue.js
===========

A very easy and clean async flow controller

[BSD Licensed](http://opensource.org/licenses/BSD-3-Clause)
-----------------------------------------------------------

All files under this repo is [BSD licensed](http://opensource.org/licenses/BSD-3-Clause).

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

    S = require('continue.js');

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

### Forward

When you transfer from one block to another block, `Forward Action` is required.
Unlike promise.js or other libraries. If you lack `Forward Action`, continue.js will breaked.

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

If you want to terminal the chain, just ignore `c()`.

Warning: `c()` should not be invoked more then one time, this will make a invoke tree. This feature is still in development.

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

Notice: `c.args` `c.value` `c.err` will changed automatic, do not use them for storage.
Warning: `c._c_xxx` is reversed for internal use, use them may cause unexcept result.

### Error flow

Error flow in continue.js is similar to promise.js.
continue.js has 2 status, `healthy` or `err`.
When one block is complete, continue.js will become to `healthy` or `err`, depends how you finish the block.
If you use `c()`, continue.js status will be `healthy`, if you throw a error in block, it will be `err`
Then continue.js goto the next block. If next block matched current status, continue.js will run the block.
And update self status. If next block not matched, continue.js will just skip the block.

What is the matched? It's very easy, `healthy` match `normal block`, `err` match `err deal block`.
All we show above is the `normal block`. `err deal block` is also very simple.

    # 2 formats for normal blocks
    }).then(function (c) {

    })(function (c) {

    # 3 formats for err deal block
    }).err(function (c) {

    }).err(function (err, c) {

    })(function (err, c) {

In normal blocks, `c.args` && `c.value` are arguments from prev blocks. And `c.err` will always be null.  
In err deal blocks, `c.args` && `c.value` will always be empty. And `c.err` will from prev block.

After all, the status of continue.js will pass to `End Node`.

If the `end blocks` do not have a callback function and the status of continue.js is `err`, continue.js will throw a Error.

If you do not hope continue.js throw Errors, or you want to known the last status, you can
pass a callback function to the end, the callback argument of the `end blocks` is different to other blocks.
    
      ....
    }).end(function (err, c) {
      // err can be null or other value, depends continue.js status
    });

### assigner

Assigner is the most powerful feature in continue.js. And lucky, it's so easy.

As we see above, we have a progrem to read file content. Before we use assigner:

    $(function (c) {
      fs.readFile('xxx.txt', c);
    })(function (c) {
      if (c.args[0]) {
        throw c.args[0];
      }
      res.send(c.args[1]);
      c();
    }).end();

It's looks not so good. Let's reconstruct is will assigner

    $(function (c) {
      fs.readFile('xxx.txt', c.assigner('err', 'fileContent'));
    })(function (c) {
      res.send(c.fileContent);
      c();
    }).end();

Assigner is a helper agent, it will assign callback argument to `c` one by one.
And `c.err` is also assignable, and it have special design.
If you assign a true value(such as object, string...) to `c.err`, continue.js will turn to `err` status.
Else, continue.js will turn to `healthy` status.

At above code, we assign 1st callback argument to `c.err`. It's so exactly, fs.readFile will set err to 1st argument.
If any error raised during read file, continue.js will turn to `err` automaticly.
It's so smart. And If everything is ok, Express.js will send the content back.
And you can deal error in `end node` together, or just let it throw to express.js

Assigner has an enhance version, name assigner2. Follow code will show you what's the different:

    var email = {}
    $(function (c) {
      email.to = 'tom@example.com';
      fs.readFile('xxx.html', c.assigner2(c, 'err', email, 'html');   // c.err = args[0], email.html = args[1]
    })(function (c) {
      fs.readFile('xxx.txt', c.assigner2(c, 'err', email, 'text');    // c.err = args[0], email.text = args[1]
    })(function (c) {
      sendmail.send(email, c);
    }).end();

If some parameters you do not want, you can pass null to assigner to ignore it:

    func(c.assigner(null, 'value'));
    func(c.assigner2(null, null, c, 'value'));   // notice: in assigner2, you must use 2 null to ignore 1 parameter

Assigner also can be used for simulate parameter number.
In some case, argument number is used for distinguish callback kind.
For example, in express, `function(res, rep, next)` is used for normal middleware,
and `function(err, res, rep, next)` is used for error handle middleware.
If you want simulate a 3 parameters function:

    app.on(c.assigner('req', 'res', 'next');
