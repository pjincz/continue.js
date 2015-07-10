continue.js 1.x
===============

设计目标
--------

* 及其友好的和回调函数合作
* 能够和promise合作
* 使得回调尽可能在1层嵌套内完成
* `continue.js`不是为了替代`async`
* `continue.js 1.x`和`0.x`在设计上有重大的变化

范例
----

    C().then(function(c, locals) {
      models.user.find(userid, c.assign('err', 'record'));
    }).then(function(c, locals) {
      locals.record.money += 20;
      locals.record.save(c.assign('err'));
    }).then(function(err, c, locals) {
      throw err;
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
`safe` 原本为 `continue.js 1.x` 设计的默认选项。但是后来由于种种局限被设计为了备选项，推荐仅在 `domain` 无法使用，
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
3. 返回一个 `Promise`
4. 在`safe`模式下抛出异常（范例见上）

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
* `end([Boolean slient], [String assign_list...], [callback])`: 通用终止函数
* `stdend([String assign_list], callback)`: 标准终止函数
* `toPromise()`: promise拼接终止函数

### 控制器

每个回调函数中都有一个特殊的变量 `c` ，即为控制器。
`c` 存在一些方法，用于流程控制。另外存在一些方法用于回调拼接。

控制器流程控制函数：
* c(...): 进入下一块，传递给c的变量将自动赋值给到 `locals.args`
* c.accept(...): 类似 `c(...)` ，但是c.accept会主动清空异常状态(清空locals.err)
* c.reject(...): 使流程进入错误状态，传递给 `c.reject` 的第一个参数将被赋值给 `locals.err` ，其他参数将被忽略
* c.break(...): 终止 `continue.js` 的流程，并直接跳转到结束块，传递给 `c.break` 的参数将赋值给 `locals.args`

控制器辅助函数：
* c.assign('a', 'b', 'c'...): 返回一个包装函数，这个函数将 `args...` 依次赋值给 `locals.a`,  `locals.b`,  `locals.c`...同时完成原有功能。
* c.assign2(var1, 'a', var2, 'b'....): 类似 `c.assign` ,但是将 `args...` 依次赋值给 `var1.a`,  `var2.b` ...

`c.accept`,  `c.reject`,  `c.break`同样可以使用 `assign` 或 `assign2` :  

    c.accept.assign(...)

### 本地变量

在回调函数中，存在着另一个特殊变量 `locals`。 `locals` 存放着所有的 `continue.js` 链上的变量。
在 `continue.js` 的处理时，可以将各种本地变量存放在 `locals` 上。尤其是控制器上 `c.assign` 和 `locals` 密不可分。
`continue.js` 链上有一些特殊变量，用于控制 `continue.js` 的流转。

特殊变量：
* `locals.err`: `continue.js` 链状态，当为 `null` 表示链处于正常状态，否则表示链处于异常状态。每次进入一个新的处理节点时。
  `continue.js`将会自动重置这个变量。可以手工修改这个变量使得链进入异常状态，但是更加推荐使用 `c.reject(...)` ，或 `c.assign('err'...)`
* `locals.args`: 存放着上一个节点控制器回调时传入的参数，初始状态为 `{}`
* `locals.adv`: 特殊高级变量

### 错误处理

`continue.js` 链在工作时，除特殊控制外，总是依次前行。每次到达一个新节点的时候， `continue.js` 将通过 `locals.err`
判断自身的状态，并做以下的处理：

    到达下一块
      状态正常(locals.err为空)
        正常块
          运行正常块>>>
        异常块
          跳过!!!
      状态异常(locals.err不为空)
        正常块
          跳过!!!
        异常块
          重置异常状态，并运行异常块>>>

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
      fs.readFile('xxx.csv', c.assign('err', 'fileCont'));
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
    fs.readFile('xxx.csv', c.assign('err'));

    // capture arguments to `locals`
    fs.readFile('xxx.csv', c.assign('err', 'fileCont'));

    // callback need special arguments length
    app.get(c.assign('err', 'req', 'res', null)); // c.assign will return a function with 4 arguments.

    // return a promise
    return User.create({...});

### end拼接，消除回调

使用`continue.js`需要处理的另一大类回调就是结束拼接了，这也是`continue.js 1.x`回炉重造的最大原因。下面展示一些如何拼接回调的例子:

    // work with standard callback
    function myFunc(done) {
      C().then(function(c, locals) {
        fs.readFile('xxx.html', c.assign('err', 'htmlCont'));
      }).then(function(c, locals) {
        fs.readFile('xxx.tet', c.assign('err', 'txtCont'));
      }).stdend('fileCont', 'txtCont', done);  
      // same as: done(locals.err, locals.fileCont, locals.txtCont); stdend do not throw anything.
    }

    // work with simple callback
    function myFunc(done) {
      C().then(function(c, locals) {
        fs.readFile('xxx.html', c.assign('err', 'htmlCont'));
      }).then(function(c, locals) {
        fs.readFile('xxx.tet', c.assign('err', 'txtCont'));
      }).end('fileCont', 'txtCont', done);  
      // same as: done(locals.fileCont, locals.txtCont);  end will throw err, if locals.err is not null!
    }

    // work with simple callback and ignore error. (BAD WAY!!!)
    function myFunc(done) {
      C().then(function(c, locals) {
        fs.readFile('xxx.html', c.assign('err', 'htmlCont'));
      }).then(function(c, locals) {
        fs.readFile('xxx.tet', c.assign('err', 'txtCont'));
      }).end(false, 'fileCont', 'txtCont', done);  
      // same as: done(locals.fileCont, locals.txtCont);  end do not throw anything.
    }

    // work with promise
    function myFunc() {
      return C().then(function() {
        fs.readFile('xxx.csv', c.assign('err', 'fileCont'));
      }).toPromise('fileCont');  
      // return a promise, if locals.err is null, locals.fileCont will set as promise value, otherwise promise will turn to rejected.
    }

### 和Promise合作(实验性)

    // 将`continue.js`链转换为Promise
    return C().then(...).toPromise();

    // 在逻辑块中使用Promise（实验性）
    C().then(function() {
      return User.find(123);
    }).then(function(c, locals, user) {
      console.log(user);
      c();
    }).stdend();

    // 由于js中无法非常正确的判断Promise，如果上面的方法失败，推荐使用下面的方法：
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

* Node.then(callback) -> Node
      增加一个正常逻辑块
      callback: function(c, locals)
      callback: function(c, locals, args...)

* Node.fail(callback) -> Node
      增加一个异常逻辑块
      callback: function(err, c, locals)

      注意：在异常逻辑块被执行前，locals.err会被重置。因此locals.err永远无法获取上一次错误。

* Node.always(callback) -> Node
      增加一个通用逻辑块，无论当前是否异常，都会被执行，可用于资源回收，但是要注意break！
      callback: function(err, c, locals)

* Node.last(callback) -> null
      结束块，大部分时候用不到，用于在结束的时候做一些结束逻辑，或者拼接一些特殊的回调
      `continue.js`进入结束时不会重置locals.err
      callback: function(err, locals)


* Node.end([silent Boolean], [assign\_list...], [callback]) -> null
      通用结束回调拼接器
      silent: [optional, Boolean, default = false] 可选参数，必须为Boolean, 表示当链异常结束时是否沉默（不抛出异常）。默认为抛出异常。
      assign_list: [optional, String] 将locals.var_name作为参数传递给callback，可以有多个。
      callback: [optional, Function] 当链结束时，会调用这个回调函数。
      
      .end('fileCont', callback) 等价于:

        .last(function(err, locals) {
          if (locals.err) {
            throw locals.err;
          }
          callback(locals.fileCont);
        });

      .end(true, 'err', 'fileCont', callback) 等价于:

        .last(function(err, locals) {
          callback(locals.err, locals.fileCont);
        });

      assign_list 支持深层次的获取变量，例如

      .end('mail.text', callback) 等价于:

        .last(function(err, locals) {
          if (locals.mail === undefined) {
            callback(undefined);
          } else {
            callback(locals.mail.text);
          }
        });

      另外可以通过这个特性获取数组中的变量，主要是为了获取args[0]等，例如
      .end('args.0', 'args.1', callback);

* Node.stdend([assign\_list], [callback]) -> null
      标准结束回调拼接器，用于适配标准回调函数
      等价于Node.end(true, 'err', [assign_list], [callback]);

* Node.toPromise(var) -> Promise.<locals[var] | locals.err>
      Promise结束拼接器，并返回一个Promise
      var同样支持深层次获取
      如果var不制定，默认获取locals.args[0]

### c

* c(...) -> null
      触发控制器，进入下一个逻辑块，如果没有下一个逻辑块，则结束
      传递给c的参数将被赋值到locals.args
      c(...)不会干预locals.err，因此可以主动给locals.err赋值使得`continue.js`进入异常状态。

* c.accept -> accept\_wrap<c>
* c.accept(...) -> null
      等价于
        locals.err = null;
        c(...);
      这个函数并没有什么特别价值，仅仅是为了和c.reject配对而存在的。

* c.reject -> reject\_wrap<c>
* c.reject(err) -> null
      等价于
        locals.err = err;
        c(...);
      适用于某些回调函数仅仅在异常时被执行，而不是通过第一个参数传递err。例如Promise的第二个回调。

* c.break -> break\_wrap<c>
* c.break(...) -> null
      等价于
        // do not do as this!!!
        while(c.next.next) {
          c.next = c.next.next;
        }
        locals.adv.breaked = true;
        c(...);
      终止`continue.js`链，并直接跳转到结束节点。
      c.break不会设置异常状态，如果需要设置异常并跳转到结束节点，需要主动设置local.err
      或者和assign, reject连用

* c.assign(...) -> assign\_wrap<c>
      返回一个c的代理，这个代理将调用参数依次赋值给locals上指定的成员。
      例如c.assign('a', 'b', 'c')(1, 2, 3)等价于：
        locals.a = 1;
        locals.b = 2;
        locals.c = 3;
        c(1, 2, 3);
      assign可以进行深层次的赋值，例如 c.assign('mail.text')('aaa') 等价于：
        if (locals.mail === undefined) {
          locals.mail = {};
        }
        locals.mail.text = 'aaa';
        c('aaa');
      通过这个特征，可以给数组中的特点元素复制（但是实际价值不大）
      另外可以通过c.assign()模拟函数参数个数，例如：
        c.length  ---> 0
        c.assign('err')  ---> 1
        c.assign('err', 'books')  ---> 2
        c.assign(null, null)  ---> 2     // null will skip assign

* c.assign2(...) -> assign2\_wrap<c>
      返回一个c的代理，这个代理将调用参数依次赋值给指定变量的指定的成员。
      例如c.assign2(locals, 'err', mail, 'text', mail, 'html')(null, 'hello', '<h1>hello</h1>')等价于：
        locals.err = null;
        mail.text = 'hello';
        mail.html = '<h1>hello</h1>';
        c(null, 'hello', '<h1>hello</h1>';
      assign2同样可以进行深层次赋值
      assign2同样可以用于参数个数模拟

* c.locals -> locals
      获取locals（当你参数懒得写, locals时）

所有的包装器都可以层迭，例如：
    c.break.reject('test') 等价于：
      locals.err = 'test';
      locals.adv.breaked = true;
      c('test');

    c.reject.break('test') 等价于：
      locals.adv.breaked = true;
      locals.err = 'test';
      c('test');

### locals

* locals.err
      链状态标志:
        null: 链状态正常
        other: 链状态异常
      每次进入一个新的逻辑块时，continue.js会根据这个变量判断当前链状态，并自动重置locals.err

* locals.args
      上次控制器被调用的所有参数，如果你有需要在整个链中被访问的数据，请不要保存在这里，这个地方在进入下一个逻辑块时会被覆盖。

* locals.adv
      特殊高级变量，初始化为{}，这个变量的存在是为了防止locals变量扩充和用户逻辑碰撞。
      locals目前保留3个变量locals.err, locals.args, locals.adv如果没有特殊的理由，locals不会再扩展新的特殊变量。
      而是将所有非重要的变量放入locals.adv

* locals.adv.breaked
      特殊情况下用于结束块，可用于判断流程是否正常结束，或被break。

* locals.adv.safe
      参见C('safe')

FAQ
---

Q: 为什么需要`c.assign2`，为什么叫`c.assign2`?  
A: 有些情况下，你需要将变量传递到`locals`之外的地方。因为`c.assign2`每次需要两个参数。

Q: 为什么需要`locals`，`locals`的工作完全可以由闭包完成?  
A: `locals`的存在是为了协同 `continue.js` 的工作，它和 `continue.js` 的核心 `assign` 密不可分。

Q: 为什么不把特殊变量独立于`locals`，这些变量让`locals`变的不安全?  
A: 特殊的变量一旦独立于`locals`，你就无法使用`c.assign`触发流程控制。而`continue.js`的强大恰恰来源于此。

Q: 为什么 `safe` 不是默认选项?  
A: 因为`domain`更加好用，安全。
