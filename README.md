TOC

Get Start
  example 1
  example 2
  example 3
Concept
  Chain
  Node
    Start Node
    Intermediate Node
    End Node
  Block
  Controller
  Parallel
API

Continue.js 1.x
===============

Node: Continue.js 1.x is not compatible with 0.x.

Continue.js is designed for wroten clean and beautiful async code in javascript.
I try it in my productive to ensure it it competent in real productive environment.
And I redesign and redesign the API of continue.js to let it sample and powerful.
I hope it can be the sword in your hand to controll the async monster.

Get Start
---------

### example 1

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

    c.assign('txt_data')  // capture args[0] -> this.txt_data
    c.assign('$err')  // capture args[0] -> c.err
    c.assign([myvar, 'xxx'])  // capture args[0] -> myvar.xxx

`this` is the context of the chain, you can store all your local variants here.
Also, you can get context from `c.locals`, they are one variant.

There are also some specific variants in c:

    c.err  // when block(not node, you will see that's the difference in next) end
           // `contiue.js` will check this to decide whether turn to exception flow
    c.lastErr // the err from the previous node
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
        c.err = err;  // if something wrong, chain will turn to exception status
        c.locals.txt_data = data;
        c(err, data);
      });
    })

I think you may understand the valuable of `c.assign`. `c.assign` is a nuclear weapon.
It can be used to remove 95%+ callbacks for join logic. And change them to a chain...

OK, what happend if c.err is set?  
Chain will turn to exception status, I will show you in next example.

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

If when flow reach `.end()` with exception status, `continue.js` will raise an exception.

Congratulations, you have finish the first lesson of `continue.js`.


