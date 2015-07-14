continue.js 1.x
===============

注意: continue.js 1.0.x目前API设计尚未完成和冻结，请不要在生产项目中使用
注意: continue.js 1.x 和 0.x 不兼容

Road Map 1.0.1 => 1.0.2
=======================

✓ locals/c的职责进一步明确，locals中的所有特殊变量全部被移除。
✓ c中添加lastErr, args等参数用于替代locals原本的职责。
✓ assign现在可以通过特殊$var操作c
✓ .then .fail .always回调函数统一签名
✓ .fail .always也可以通过额外参数获取args
✓ 移除node上的状态变量，使得node成为无状态上下文
✓ 移除assign2
✓ 添加for支持(并发、序列)
✓ 添加并发节点支持
✓ 设计assign自动生成的中间变量，以适应各种场合需求
✓ c.err不再判定null，而是判定是否成立，如果成立则认为流程进入异常。也就是说undefined, false不会再使得流程进入异常

设计目标
--------

* 及其友好的和回调函数合作
* 能够和promise合作
* 使得回调尽可能在1层嵌套内完成
* 在一些简单的场合能够代替async

范例
----

    C().then(function(c, locals) {
      models.user.find(userid, c.assign('$err', 'record'));
    }).then(function(c, locals) {
      locals.record.money += 20;
      locals.record.save(c.assign('$err'));
    }).end();

文档：
------

### `continue.js`链

`continue.js` 链为 `continue.js` 使用的核心，一个典型的 `continue.js` 链由3个部分组成。

* 起点：`C(opts...)`
* 逻辑块：`.then(...)`, `.fail(...)`, `.always(...)`
* 结束：`.last(...)`, `.end(...)`, `.stdend(...)`, `.toPromise(...)`

### 起点

`continue.js` 的所有逻辑开始于起点。起点非常的简单，只需要一个简单的 `C()` 即可。起始节点也可以接受一些链选项。
这个时候，需要调用C(opts...)。为了便于使用 `opts` 的参数为字符串列表，而不是hash。可用参数：

* `safe`: 使得 `continue.js` 捕获在 `continue.js` 链中发生的异常，并转入异常状态。这是一个乍一看很强大的功能。
但是在实际的使用中，强烈推荐不要使用这种方式，而是使用`domain`功能进行异常处理，这会让你的代码变得清晰且愉悦。
另外由于js异常处理的局限，使用这种方式后会导致一些情况下异常抛出位置丢失，导致调试和定位问题困难。
`safe` 原本为 `continue.js 0.x` 设计的默认选项。但是后来由于种种局限在`1.x`被设计为了备选项，推荐仅在 `domain` 无法使用，
并且必须强异常保护的场合使用。注意， `safe` 仅能保护逻辑块，不能保护结束中的回调。范例：

      C("safe").then(function(c, locals) {
        throw 'test';
      }).then(function(err, c, locals) {
        console.log(err);
      }).end();

### 逻辑块

`continue.js` 的逻辑块存放这你的所有业务逻辑代码。在正常情况下 `continue.js` 将依次调用逻辑块。
每一个逻辑块为一块同步代码，当控制器被触发时，进入到下一个逻辑块。

每一个逻辑块都需要正确的触发控制器才能进入到下一个逻辑块。控制器的处罚有几种不同的方法：
1. 直接触发，例如 `c()`， `c.accept()`
2. 将控制器作为回调函数传递给异步函数：`setTimeout(c)`
3. 在`safe`模式下抛出异常（范例见上）

逻辑块分两种：
* 正常块
* 异常块

详情参见异常处理。

### 结束

`continue.js` 的最后一个部分，也是 `continue.js` 链不可或缺的一部分。终止块的功能包括：
* 异常处理
* 完成通知
* 链触发：当缺少终止块时，整个 `continue.js` 将不会运行。  

终止函数：
* `last(c, locals)`: 自定义终止函数，完成复杂的结束逻辑
* `end([Boolean slient], [String assign_list...], [callback])`: 通用终止函数
* `stdend([String assign_list], callback)`: 标准终止函数，注意标准函数不允许省略callback
* `toPromise()`: promise拼接终止函数

### 控制器

每个回调函数中都有一个特殊的变量 `c` ，即为控制器。
`c` 存放了一个块在被调用的时候的所有上下文。以及用于流程控制。

控制器上下文变量：
* c.lastErr: 上个块结束时的错误
* c.args: 在上个块中c被调用的所有参数，注意，在上一个块中c不一定是被直接调用的，c.reject，c.accept，c.break
  或者他们的组合，c.args都可以正常工作
* c.err: 当前块错误信息，初始为null，当块结束时，如果这个变量是一个true值的变量（例如非空字符串，数组，对象等），则流程进入异常流

控制器流程控制函数：
* c(...): 进入下一块，传递给c的变量将自动赋值给到下一个块的 `c.args`
* c.accept(...): 类似 `c(...)` ，但是c.accept会主动清空异常状态
* c.reject(...): 使流程进入错误状态，传递给 `c.reject` 的第一个参数将被赋值给 `c.err`
* c.break(...): 如果在循环中，则终止循环，否则的话终止整个调用链。终止后，在下一个节点中c.breaked = true

控制器辅助函数：
* c.assign('a', 'b', 'c'...): 返回一个包装函数，这个函数将 `args...` 依次赋值给 `locals.a`,  `locals.b`,  `locals.c`...
同时完成原有功能。`c.accept`,  `c.reject`,  `c.break`同样可以使用 `assign`:  

    c.accept.assign(...)

### 本地变量

在回调函数中，存在着另一个特殊变量 `locals`。 `locals` 存放着所有的 `continue.js` 链上的变量。
在 `continue.js` 的处理时，可以将各种本地变量存放在 `locals` 上。尤其是控制器上 `c.assign` 和 `locals` 密不可分。
`locals`是`continue.js`工作的核心之一。善用`locals`可以让你的代码清晰简洁。

### 错误处理

`continue.js` 链在工作时，除特殊控制外，总是依次前行。每次到达一个新节点的时候， `continue.js` 将通过 `c.lastErr`
判断自身的状态，并做以下的处理：

    到达下一块
      状态正常(c.lastErr为空)
        正常块
          运行正常块>>>
        异常块
          跳过!!!
        always块
          总是执行
      状态异常(c.lastErr不为空)
        正常块
          跳过!!!
        异常块
          重置异常状态，并运行异常块>>>
        always块
          总是执行

### 使用控制器消除回调

`continue.js`的控制器上有很多的函数，都是为了消除逻辑块中的回调而存在的。正确的使用控制块消除回调，才能发挥出`continue.js`的威力。

    // bad
    C().then(function(c, locals) {
      fs.readFile('xxx.csv', function(err, data) {
        if (err) {
          c.reject(err);
        } else {
          locals.fileCont = data;
          c.accept();
        }
      });
    }).then(function(c, locals) {
      console.log(locals.fileCont);
      c();
    }).end();

    // good
    C().then(function(c, locals) {
      fs.readFile('xxx.csv', c.assign('$err', 'fileCont'));
    }).then(function(c, locals) {
      console.log(locals.fileCont);
      c();
    });

上面两段代码完成的完全一样的逻辑（没有任何的区别）。但是一句正确的控制器使用，却代替了7行代码。可见控制器的强大。
下面是一些如何使用控制器的范例：

    // no callback argument
    setTimeout(c, 1000);

    // callback invoked when succeed or failed
    User.create({...}).then(c.accept, c.reject);

    // standard callback (err as first argument)
    fs.readFile('xxx.csv', c.assign('$err'));

    // capture arguments to `locals`
    fs.readFile('xxx.csv', c.assign('$err', 'fileCont'));

    // callback need special arguments length
    app.get(c.assign('$err', 'req', 'res', null)); // c.assign will return a function with 4 arguments.

    // use promise in block
    User.create({...}).then(c.accept, c.reject);

在assign中，aaa表示设置locals.aaa，$err表示设置c.err，xxx.yyy表示设置locals.xxx.yyy

### end拼接，消除回调

使用`continue.js`需要处理的另一大类回调就是结束拼接了，这也是`continue.js 1.x`回炉重造的最大原因。下面展示一些如何拼接回调的例子:

    // work with standard callback
    function myFunc(done) {
      C().then(function(c, locals) {
        fs.readFile('xxx.html', c.assign('$err', 'htmlCont'));
      }).then(function(c, locals) {
        fs.readFile('xxx.tet', c.assign('$err', 'txtCont'));
      }).stdend('fileCont', 'txtCont', done);  
      // same as: done(c.lastErr, locals.fileCont, locals.txtCont); stdend do not throw anything.
    }

    // work with simple callback
    function myFunc(done) {
      C().then(function(c, locals) {
        fs.readFile('xxx.html', c.assign('$err', 'htmlCont'));
      }).then(function(c, locals) {
        fs.readFile('xxx.tet', c.assign('$err', 'txtCont'));
      }).end('fileCont', 'txtCont', done);  
      // same as: done(locals.fileCont, locals.txtCont);  end will throw err, if c.lastErr!
    }

    // work with simple callback and ignore error. (BAD WAY!!!)
    function myFunc(done) {
      C().then(function(c, locals) {
        fs.readFile('xxx.html', c.assign('$err', 'htmlCont'));
      }).then(function(c, locals) {
        fs.readFile('xxx.tet', c.assign('$err', 'txtCont'));
      }).end(false, 'fileCont', 'txtCont', done);  
      // same as: done(locals.fileCont, locals.txtCont);  end do not throw anything.
    }

    // work with promise
    function myFunc() {
      return C().then(function() {
        fs.readFile('xxx.csv', c.assign('$err', 'fileCont'));
      }).toPromise('fileCont');  
      // return a promise, if c.lastErr, locals.fileCont will set as promise value, otherwise promise will turn to rejected.
    }

### 和Promise合作

    // 将`continue.js`链转换为Promise
    return C().then(...).toPromise();

    // 在逻辑块中使用Promise
    C().then(function() {
      User.find(123).then(c.accept, c.reject);
    }).then(function(c, locals, user) {
      console.log(user);
      c();
    }).stdend();


API
---

### Start Node

* S() -> Node
      开始一个默认链
* S(opts...) -> Node
      开始一个带选项的链
      'safe': 捕捉逻辑块中发生的异常，并将链状态转为异常状态

### Node

* Node#then(callback) -> Node

        增加一个正常逻辑块
        callback: function(c, locals)
        callback: function(c, locals, args...)

* Node#then(callback, callback...) -> Node

        并行运行callbacks...
        注意：在并行运行时，传递给c()的参数，将不会被下一个块的c.args捕捉。
              在并行运行中的任意一个任务失败，会导致整个块失败。
              目前仅.then支持并发，.fail和.always不支持。

* Node#fail(callback) -> Node

        增加一个异常逻辑块
        callback: function(c, locals)
        callback: function(c, locals, args...)

* Node#always(callback) -> Node

        增加一个通用逻辑块，无论当前是否异常，都会被执行，可用于资源回收，但是要注意c.break会跳过always！
        callback: function(c, locals)
        callback: function(c, locals, args...)

* Node#last(callback) -> null

        结束块，大部分时候用不到，用于在结束的时候做一些结束逻辑，或者拼接一些特殊的回调
        callback: function(c, locals)

* Node#end([silent Boolean], [assign\_list...], [callback]) -> null

        通用结束回调拼接器
        silent: [optional, Boolean, default = false] 可选参数，必须为Boolean, 
                表示当链异常结束时是否沉默（不抛出异常）。默认为抛出异常。
        assign_list: [optional, String] 将locals.var_name作为参数传递给callback，可以有多个。
        callback: [optional, Function] 当链结束时，会调用这个回调函数。
    
        .end('fileCont', callback) 等价于:

          .last(function(c, locals) {
            if (c.lastErr) {
              throw c.lastErr;
            }
            callback(locals.fileCont);
          });

        .end(true, '$lastErr', 'fileCont', callback) 等价于:

          .last(function(c, locals) {
            callback(c.lastErr, locals.fileCont);
          });

        assign_list 支持深层次的获取变量，例如

        .end('mail.text', callback) 等价于:

          .last(function(c, locals) {
            if (c.lastErr) {
              throw c.lastErr;
            }
            if (locals.mail === undefined) {
              callback(undefined);
            } else {
              callback(locals.mail.text);
            }
          });

        另外可以通过这个特性获取数组中的变量，主要是为了获取args[0]等，例如
        .end('$args.0', '$args.1', callback);

* Node#stdend([assign\_list], [callback]) -> null

        标准结束回调拼接器，用于适配标准回调函数
        等价于Node#end(true, 'err', [assign_list], [callback]);

* Node#toPromise(var) -> Promise.<locals[var] | c.lastErr>

        Promise结束拼接器，并返回一个Promise
        var同样支持深层次获取
        如果var不指定，默认获取c.args[0]

* Node#for([limit], Array, callback) -> Node
* Node#for([limit], Object, callback) -> Node
* Node#for([limit], iterator, args...) -> Node
* Node#for([limit], String, args...) -> Node

        循环执行给定的块，直到完成for中指定的所有任务，或者c.break()，或者某个任务返回错误
        limit: 并发数量，如果不指定默认为 1
        Array: 遍历数组，并调用回调，此时回调函数签名为：
            callback: function(idx, value, c, locals)
        Object: 遍历对象，并调用回调，此时回调函数的前面为：
            callback: function(key, value, c, locals)
        iterator: 迭代器函数，`continue.js` 每次调用iterator(args)获得一个新的任务
            如果iterator(args)返回函数，则.for会执行函数。
            如果iterator(args)返回空，则表示所有任务迭代完成。
            iterator(args)返回的函数签名必须是：
                callback: function(c, locals)
        String: 先通过c.get()获取对应变量后，在根据变量类型判断执行上面3种情况中的一种

        在.for中可以通过c.break()终止.for。这时可以在下一个块中通过c.breaked判断for是否是被break终止的。
        当.for中任意一个任务异常结束时，.for不会继续后续任务。这时可以在下一块中通过c.lastErr判断

        注意：当.for在并行运行时发生错误或break时，.for节点不会立即结束，而是等待目前已经运行的任务都结束后才会进入下一个块。

### c

* c(...) -> null

        触发控制器，进入下一个逻辑块，如果没有下一个逻辑块，则结束
        传递给c的参数将被赋值到下一个块的c.args
        c(...)不会主动修改c.err，因此可以主动给c.err赋值使得`continue.js`进入异常状态。

* c.accept -> accept\_wrap<c>
* c.accept(...) -> null

        等价于
          c.err = null;
          c(...);
        这个函数主要用于promise拼接。

* c.reject -> reject\_wrap<c>
* c.reject(err) -> null

        等价于
          c.err = err;
          c(...);
        适用于某些回调函数仅仅在异常时被执行，而不是通过第一个参数传递err。例如Promise的第二个回调。

* c.break -> break\_wrap<c>
* c.break(...) -> null

        如果在.for节点中，则终止.for的执行，否则终止整个链的执行并跳转到结束块。
        c.break不会设置异常状态，如果需要设置异常并跳转到结束节点，可以主动设置local.err
        或者和assign, reject连用

* c.assign(...) -> assign\_wrap<c>

        返回一个c的代理，这个代理将调用参数依次赋值给locals上指定的成员。
        例如c.assign('a', 'b', 'c')(1, 2, 3)等价于：
          locals.a = 1;
          locals.b = 2;
          locals.c = 3;
          c(1, 2, 3);
        assign可以进行深层次的赋值，例如 c.assign('mail.text', 'xxx.0')('aaa', 'bbb') 等价于：
          if (locals.mail === undefined) {
            locals.mail = Hash();
          }
          if (locals.xxx === undefined) {
            locals.xxx = Hash();
          }
          locals.mail.text = 'aaa';
          locals.xxx[0] = 'bbb';
          c('aaa', 'bbb');
        当assign是，如果途径的变量不存在，则自动会构造一个Hash的实例，Hash包含一些特殊的函数便于使用和收集数据
        当assign的名字以$打头时，assign将会操作c，例如 c.assign('$err')('test err') 等价于：
          c.err = 'test err';
          c('test err');
        另外可以通过c.assign()模拟函数参数个数，例如：
          c.length  ---> 0
          c.assign('$err')  ---> 1
          c.assign('$err', 'books')  ---> 2
          c.assign(null, null)  ---> 2     // null will skip assign

* c.locals -> locals

        获取locals（当你参数懒得写, locals时）

* c.lastErr

        上一个块结束时的错误信息

* c.err

        当前块的错误信息，如果当前块结束的时候不为空，`continue.js`进入错误流

* c.args

        上一个块中c被调用时的参数

* c.breaked

        标志c.break是否被触发


所有的包装器都可以层迭，例如：

    c.break.reject('test') 等价于：
      c.err = 'test';
      c.breaked = true;
      c('test');

    c.reject.break('test') 等价于：
      c.breaked = true;
      c.err = 'test';
      c('test');

### Hash

当c.assign在进行操作时，如果遇到不存在在路径上的变量，continue.js会自动建立Hash的实例，例如：

    c.assign('user.name')('tony');

这个时候，locals.user如果不存在，将会自动创建一个Hash的实例。

* Hash#toArray -> Array

        将Hash中数字下标的元素抽取出来，并创建一个数组。

FAQ
---

Q: 为什么需要`locals`，`locals`的工作完全可以由闭包完成?  
A: `locals`的存在是为了协同 `continue.js` 的工作，它和 `continue.js` 的核心 `assign` 密不可分。

Q: 为什么 `safe` 不是默认选项?  
A: 因为`domain`更加好用，安全。

Q: 为什么存在3个结束函数?  
A: 用了就知道了
