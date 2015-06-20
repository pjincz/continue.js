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

### Start

    
