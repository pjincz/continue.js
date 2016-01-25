
Continue.js 1.x
===============

Node: Continue.js 1.x is not compatible with 0.x.

Continue.js is designed for wroten clean and beautiful async code in javascript.
I try it in my productive to ensure it it competent in real productive environment.
And I redesign and redesign the API of continue.js to let it sample and powerful.
I hope it can be the sword in your hand to controll the async monster.

Get Start
---------

### Tutorial 1 (Basic chain)

At the beginning, let do an easy task: Read two files from disk and send it as an email.

    // implement with callback
    fs.readFile('mail.txt', function(err, txt_data) {
      if (err) {
        throw err;
      }
      fs.readFile('mail.html', function(err, html_data) {
        if (err) {
          throw err;
        }
        transporter.sendMail({
          from: 'alice@example.com',
          to: 'bob@example.com',
          subject: 'a test email',
          text: txt_data,
          html: html_data
        }, function(err, info) {
          if (err) {
            throw err;
          }
          console.log('Message sent: ' + info.response);
        });
      });
    });

    // implement with continue.js
    var C = require('continue.js');
    C().then(function(c) {
      fs.readFile('mail.txt', c.assign('$err', 'txt_data'));
    }).then(function(c) {
      fs.readFile('mail.html', c.assign('$err', 'html_data'));
    }).then(function(c) {
      transporter.sendMail({
        from: 'alice@example.com',
        to: 'bob@example.com',
        subject: 'a test email',
        text: this.txt_data,
        html: this.html_data
      }, c.assign('$err', 'info'));
    }).then(function(c) {
      console.log('Message sent: ' + info.response);
      c();
    }).end();

As you see, we let the ugly indent away. There too implement is complete same.
If you have more files need to read, the old implement is worse.

OK, let me explain what happend.

    var C = require('continue.js');  // Of course, we need this line

    C()  // Construct a logic chain, we always need this in a new chain
    .then(...)  // Add a `then node` into the chain.
    .end()  // Finish the chain. Do not forget this

Just as you imagine, nodes in chain will be execute one by one.
In this example, we read 'mail.txt' first, and then read 'mail.html', and then
send them as email, and then we show the result, and after all, we are done(end).

Now, let us focus on one node.

    .then(function(c) {
      fs.readFile('mail.txt', c.assign('$err', 'txt_data'));
    })

It's looks very strange, there is no done or cb function for an async func.
And what the `c` is, what the `c.assign` is?

`c` in our words is Controller. The controller of the flow.
With `c`, we can goto the next node, drop to exception flow, break the chain...
For example:

    c(); // goto the next node
    c.accept(); // reset the error, and goto the next node
    c.reject(); // set error, and goto the next node
    c.break(); // break chains, jump to the last node

But, what's the `c.assign`?  
Yes, assign is not flow controll function, it's an assistant function.
When you call `c.assign('$err', 'txt_data')(null, 'hello')`, `continue.js` will
capture the `null` and `'hello'` and save to some where.

Yes some where, arguments in assign have 3 formats:

    c.assign('$err', 'txt_data', [myvar, 'xxx'])
    // args[0] -> c.err
    // args[1] -> this.txt_data
    // args[2] -> myvar.xxx

`this` is the context of the chain, you can store all your local variants here.
Also, you can get context from `c.ctx`, they are one variant.

There are also some specific variants in c:

    c.err  // Current status of the chain
    c.args // the arguments to invoke controller from the previous node

`c.assign('$err', 'txt_data')(null, 'hello')`? It's looks ugly and valueless.  

Yes, if you call it in this way, it's idiotic. Let's unfold the codes:

    .then(function(c) {
      fs.readFile('mail.txt', c.assign('$err', 'txt_data'));
    })

    // equal to
    .then(function(c) {
      fs.readFile('mail.txt', function(err, data) {
        c.assign('$err', 'txt_data')(err, data);
      });
    })

    // equal to
    .then(function(c) {
      fs.readFile('mail.txt', function(err, data) {
        c.err = err;  // if something wrong, chain will turn to exceptional status
        c.locals.txt_data = data;
        c(err, data);
      });
    })

I think you may understand the valuable of `c.assign`. `c.assign` is a nuclear weapon.
It can be used to remove 95%+ callbacks for join logic. And change them to a chain...

OK, what happend if c.err is set?  
Chain will turn to exceptional status, I will show you in next example.

Let's go on, in summary, all code in this node do an easy thing:  
Call fs.readFile, and assign the result to `c.err` and `this.txt_data` and goto the next node.

    // 2nd node
    .then(function(c) {
      fs.readFile('mail.html', c.assign('$err', 'html_data'));
    })

This node is similar, read 'mail.html' => `this.html_data`, store err to c.err, and goto the next.

    // 3rd node
    .then(function(c) {
      transporter.sendMail({
        from: 'alice@example.com',
        to: 'bob@example.com',
        subject: 'a test email',
        text: this.txt_data,
        html: this.html_data
      }, c.assign('$err', 'info'));
    })

This node is similar too, we send the mail by transporter, and capture result, and go on.

    // 4th node
    .then(function(c) {
      console.log('Message sent: ' + info.response);
      c(); // do not forget this
    })

This node is looks different! Yes, it's a sync node. We can see a strange `c()` in tail.
In this node, we do not call any async func, but we have to guarantee controller is invoked.
So we invoke `c()` directly, here. Do not forget this, elsewise all node after will not be executed.

    // last node
    .end(); // do not forget this also

At the last, we finish the chain with `.end()`. Notice: this node is needful. If you lack end node.
The chain will not works at all.

If when flow reach `.end()` with exceptional status, `continue.js` will raise an exception.

Tutorial 1 is done, are you feeling good? :p, This just a start, I hope you can feel better later.

### Tutorial 2 (Exception flow)

In example 1, we sent a mail with text and html. But some time, text file not exists or html not
exists may be not a problem...

    var C = require('continue.js');
    C().then(function(c) {
      fs.readFile('mail.txt', c.assign('$err', 'txt_data'));
    }).fail(function(c) {                                               // *1
      c.err.code === 'ENOENT' ? c.accept() : c();                       // *1
    }).then(function(c) {
      fs.readFile('mail.html', c.assign('$err', 'html_data'));
    }).fail(function(c) {                                               // *1
      c.err.code === 'ENOENT' ? c.accept() : c();                       // *1
    }).then(function(c) {
      if (!this.txt_data && !this.html_data) {                          // *2
        c.reject('no mail body!');                                      // *2
        return;                                                         // *2
      }                                                                 // *2
      transporter.sendMail({
        from: 'alice@example.com',
        to: 'bob@example.com',
        subject: 'a test email',
        text: this.txt_data,
        html: this.html_data
      }, c.assign('$err', 'info'));
    }).then(function(c) {
      console.log('Message sent: ' + info.response);
      c();
    }).end();

We add 8 lines to our new code. At `*1` we see `.fail`.
What's the `.fail` is, what's the different with `.then` and `.fail`?
In order to explain this problem, I paint a characters image, :).

          Normal            Exceptional

           S()
            |
            |    err occur
          .then --------------> |
            |                   |
            |    err recover    |
            | <-------------- .fail
            |                   |
            |    err occur      |
          .then --------------> |
            |                   |
            |    err recover    |
            | <-------------- .fail
            |                   |
            |    err occur      |
          .then --------------> |
            |                   |
            |    err occur      |
          .then --------------> |
            |                   |
            \-------------------/
                      |
                    .end

When a chain start, it is initialized with normal status.
In our example, the chain meet the first node `.then`.
In the first node, we tried to read 'mail.txt'.
If there is no file named mail.txt, this node will failed with ENOENT.
And the chain turn to exceptional status.
In this case, we want to check the error, because text for a mail is not requried.
In `.fail` node, we check whether the error is ENOENT. If so, we recover the error.

Chain have 2 status, normal/exceptional. When chain reach a new node, `continue.js` will test
whether this node is need to execute. We have many way to change the status of the chain.

    // Change chain status manually
    // if c.err set to a false value(See also js false values), chain turn to Normal Status
    // elsewise, chain turn to Exceptional Status
    c.err = ...;

    // reset c.err and invoke controller
    c.accept(...);

    // set c.err and invoke controller
    // the first arguments will be err info, if the first value is a false value, err will be 'UnknownError'
    c.reject(...);

    // use c.assign
    async_func(c.assign('$err', ...));

`.then` nodes are only executed in Normal status, `.fail` nodes are only executed in Exceptional status.
We also have `.always` node, they are executed whether in Normal or Exceptional status.
So we paint a image show all nodes.


          Normal            Exceptional

           S()
            |
            |    err occur
          .then --------------> |
            |                   |
            |    err recover    |
            | <-------------- .fail
            |                   |
            |    err occur      |
          .for ---------------> |
            |                   |
            \-------------------/
                      |
                   .always
                      |
            /-------------------\
            |                   |
            \-------------------/
                      |
        .last/.end/.stdend/.toPromise

At last, chain status will pass end node. In most case, we use `.end` finish the chain.
In this case, `.end` will throw a exception if chian is in exceptional status.

That all about deal err in `continue.js`. :P

### Tutorial 3 (loop)

Loop in `continue.js` is also very easy. Here, we show how to show all SHA1SUM of files in directory with async way.

    C().then(function(c) {
      fs.readdir(dir, c.assign('$err'));                                      // *1
    }).then(function(c, err, files) {                                         // *2
      this.files = [];                                                        // *3
      files.forEach(function(file, i) {
        this.files[i] = { name: file, path: path.join(dir, file) };
      }, this);
      c(); // do not forget this...
    }).for('files', function(c, idx, file) {                                  // *4
      fs.stat(file.path, c.assign('$err', [file, 'stats']));                  // *5
    }).for('files', function(c, idx, file) {                                  // *6
      if (file.stats.isFile()) {
        sha1(file.path, c.assign('$err', [file, 'sha1']));
      } else {
        file.sha1 = '-';
        c(); // do not forget this...
      }
    }).then(function(c) {                                                     // *7
      this.files.forEach(function (fi) {
        var f = fi.stats.isFile() ? 'F' : 'D';
        console.log('[' + f + '] ' + fi.name + '  ' + fi.sha1);
      });
      c(); // again, do not forget this...
    }).end();

1. Read dir and capture err to c.err
2. If no err occurs, get args from last node, here use a new feature, see API document for details.
3. Initialize this.files and assign basic file infos to
4. async loop here!
5. get file stats and assign to files
6. another loop, in here we calculate sha1 for every files, or set '-' for directories
7. Everything is ok, let's show result.

It's really easy, `.for` has several forms.

    .for(['a', 'b', 'c'], function(c, idx, ele) {...});
    // I think i do not need explain more... :P

    .for({a: 1, b: 2, c: 3}, function(c, key, value) {...});
    // I think i do not need explain more, too... :P

    .for(iterator, args...)
    // iterator must be a Function
    // `continue.js` call iterator multi times with `args...`
    // If iterator return a Block, `continue.js` will execute Block
    // If iterator return null, `continue.js` will finish loop.

    .for(null || undefined || false, args...)
    // do nothing

    .for(String, args...)
    // `continue.js` will get value from chian context or c, and invoke as one of above

Also, you can break loop:

    c.break(...);

Are you feel good with `continue.js`? :P

### Tutorial 4 (parallel)

Parallel in `continue.js` is also very easy. Everything in `continue.js` is very easy.
Is it right? :)

In example 1, read text and html are irrelevant, let's try to parallel them.

    var C = require('continue.js');
    C().then(function(c) {
      fs.readFile('mail.txt', c.assign('$err', 'txt_data'));
    }, {                                                            // *1
      fs.readFile('mail.html', c.assign('$err', 'html_data'));
    }).then(function(c) {
      transporter.sendMail({
        from: 'alice@example.com',
        to: 'bob@example.com',
        subject: 'a test email',
        text: this.txt_data,
        html: this.html_data
      }, c.assign('$err', 'info'));
    }).then(function(c) {
      console.log('Message sent: ' + info.response);
      c();
    }).end();

Notice `*1`, it's looks strange, here is a comma, not .then.... Yes, as you see:

    .then(function(c){...}, function(c){...}, function(c){...}...)

From here, we have a new concept: `block`, let above looks better

    .then(block1, block2, block3...)

When a node have multi blocks, they will parallelable.

Also we can parallel .for:

    .for(10, 'files', ....)
    // run all blocks in for in parallel with limit 10

If you want unlimit parallel:

    .for(9999, 'files', ....)
    // T_T, I don't think this is a good idea...

But, notice: Parallel is not a free ticket. For example:

* If one of blocks failed, a node is failed, and we can not known which block is failed in a easy way.
* If one of blocks failed, you cannot stop onather blocks.
* If more then one blocks failed, you cannot capture all errors, and you don't known which err is captured.
* If you break a loop, the tasks after this maybe already started, and `continue.js` have to wait them.

Take care of parallel, consider in cautious whether you need parallel.

congratulations, :). If you still here, you have learn all of `continue.js`, do you feel it's a good
library? See API Reference for more.

API Reference
-------------

### Concept

* Chain  
  All `nodes` in `continue.js` is executed one by one as a chain, so we call it `chain`.

* Node  
  One `chain` include 3 parts: `Start node`, `Logic nodes`, `End node`

  * Start Node:  
    The start of a chain.

    `S()`  
    `S('safe')`  

  * Logic Node:  
    Contains work logic, may contains one or more blocks

    `.then(block)`  
    `.then(block1, block2...)`  
    `.fail(block)`  
    `.always(block)`  
    `.for([parallel_limit], [loop var or iterator], callback)`  

  * Last Node:  
    Last logic of a chain: resource collect, error deal, invoke callback...

    `.end([silient = false], [assign_list...], callback)`  
    `.stdend([assign_list], callback)`  
    `.last(Block)`  

* Block  
  Logic Node or Last Node may contains one or more Blocks.
  Each block have same function signature:

  `function(c, extra arguments from previous node...)`

* Controller  
  Each Block receive a Controller when executed, life circle of Controller is during executing of Block.
  Controller have several status variants, and several flow controll function.

* Chain Context  
  When a chain is invoked, a Chain Context is initialized to {}.
  All the chain life, you can use this variant to storage and pass your local variants.
  You have several ways to access Chain Context:

  1. `this`, when you in Block
  2. `c.ctx`, when you in Block and this is recovered by some reason
  3. `c.get(...)`, `c.set(...)`
  4. `c.assign(...)`
  5. `.for('var'...)`
  6. `.end('files', callback)`, `.stdend('files', callback)`

### Chain

* `S()` -> `Chain`
* `S('safe')` -> `Chain`

    Start a chain

* `Chain#then(block)` -> `Chain`

    Add a node for normal status

* `Chain#then(block1, block2...)` -> `Chain`

    Add a parallel node for normal status

* `Chain#fail(block)` -> `Chain`

    Add a node for exceptional status

* `Chain#always(block)` -> `Chain`

    Add a node for both normal and exceptional status

* `Chain#for([limit], Array, callback)` -> `Chain`

    Add a loop node for normal status  
    All elements in Array will be accessed  
    callback: function(c, idx, value)  
    if limit > 1, loop node will be run in parallel  

* `Chain#for([limit], Object, callback)` -> `Chain`

    Add a loop node for normal status  
    All elements in Object will be accessed, values in __proto__ will not be accessed  
    callback: function(c, key, value)  
    if limit > 1, loop node will be run in parallel  

* `Chain#for([limit], undefined || null || false)` -> `Chain`

    Do nothing

* `Chain#for([limit], iterator, args...)` -> `Chain`

    iterator will be invoke multi times as iterator(args...)  
    If iterator(args...) return a Block, the Block will be executed  
    If iterator(args...) return null, loop will be finished  
    In iterator this is same to Controller  

* `Chain#for([limit], String, args...)` -> `Chain`

    Get loop variant by c.get(String) and do one of above  
    For more details, see `Controller#get`  

* `Chain#last(block)` -> `null`

    Add last node to chain, and invoke chain.

* `Chain#end([noise = true], [assign_list...], [callback])` -> `null`

    Add last node to chain, and invoke chain.
    This is a helper method for instead of Chain#last.

    noise = true || false, if noise is true and c.err is a true value, c.err is throwed.  
    callback = Function, if callback is given, callback is invoked with assign_list.  
    assign_list = string..., if assign_list is given, callback will as callback(c.get(a0), c.get(a1)...)  

* `Chain#stdend([assign_list], callback)` -> `null`

    Another helper method for instead of Chain#last.

    callback will be invoked as: callback(c.err, c.get(assign_list[0]), c.get(assign_list[1])...)  
    Chain#stdend do not throw anything

    To prevent leak of err deal, callback is designed required.
    If you want to drop err, you can use: .end(false)

* `Chain#toPromise([assign])` -> `Promise`

    Convert Chain to a Promise.  
    If Chain is finished without normal status, promise turn to fulfilled, elsewise, promise turn to rejected.  
    If assign is given, fullfill value will set to c.get(assign)  

### Controller

#### variables

* `c.ctx` -> Chain Context
* `c.err` -> Chain Error
* `c.args` -> Arguments from previous node
* `c.breaked` -> is previous node breaked

#### methods

* `Controller(...)` -> null

    Invoke c and flow goto the next node. All arguments pass to c will be store to c.args in next node.

* `Controller#accept` -> `accept_wrap<Controller>`
* `Controller#accept(...)` -> `null`

    Equal to:
      c.err = null;
      c(...);

* `Controller#reject` -> `reject_wrap<Controller>`
* `Controller#reject(...)` -> `null`

    Equal to:
      c.err = arguments[0] || 'UnknownError';
      c(...);

* `Controller#break` -> `break_wrap<Controller>`
* `Controller#break(...)` -> `null`

    If in loop node, break loop node.
    Else break chain, and jump to last node.

* `Controller#retry(...)` -> `null`

    Re-run block

* `Controller#assign(assign_list)` -> `assign_wrap<Controller>`

    Return a proxy of c, call c.set for each assign, and then invoke c(...)

    Equal to:
      for (var i = 0; i < assign_list.length; ++i) {
        c.set(assign_list[i], arguments[i]);
      }
      c(...);

    For more details, see Controller#set

All above methods can be chained:

`c.accept.assign('x')` -> `assign_wrap<accept_wrap<Controller> >`

* `Controller#get('aaa')` -> `c.ctx.aaa`
* `Controller#get('$err')` -> `c.err`
* `Controller#get([x, 'aaa'])` -> `x.aaa`
* `Controller#get('aaa.bbb')` -> `c.ctx.aaa === undefined ? c.ctx.aaa : c.ctx.aaa.bbb`

* `Controller#set(target, value)`: similar to get, but set value

### Block

All blocks have same signature:

function(c)

blocks can receive arguments from last node:

    C().then(function(c) {
      c(1, 'a');
    }).then(function(c, x, y) {
      // x === 1
      // y === 'a'
      c();
    }).end();

###
