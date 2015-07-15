/* This example simulate implement a dirlist in express
 */
var C = require('../lib/continue.js');
var fs = require('fs');
var path = require('path');
var execFile = require('child_process').execFile;

var dir = path.join(process.argv[2] || __dirname);

var sha1 = function(fpath, mtime, done) {
  // you can implement cache here...
  execFile('/usr/bin/sha1sum', [fpath], function(err, stdout, stderr) {
    done(err, stdout.toString().replace(/\s+[\s\S]*$/, ''));
  });
};

C().then(function(c) {
  fs.readdir(dir, c.assign('$err', 'files')); // *1
}).for(10, 'files', function(c, idx, fname) { // *2
  c.set('fis.' + idx + '.name', fname); // *3
  fs.stat(path.join(dir, fname), c.assign('$err', 'fis.' + idx + '.stats')); // *4
}).for(10, 'files', function(c, idx, fname) {
  if (this.fis[idx].stats.isFile()) {
    sha1(path.join(dir, fname), c.assign('$err', 'fis.' + idx + '.sha1')); // *5
  } else {
    c.set('fis.' + idx + '.sha1', '-');
    c(); // do not forget this...
  }
}).then(function(c) { // *6
  this.fis.toArray().forEach(function (fi) {
    var f = fi.stats.isFile() ? 'F' : 'D';
    console.log('[' + f + '] ' + fi.name + '  ' + fi.sha1);
  });
  c(); // again, do not forget this...
}).end();

// *1 read dir, and assign err to c.err, result to this.files
// *2 for in this.files and max parallel 10
// *3 set this.fis.[idx].name to file name
// *4 get file stats and set result to this.fis.[idx].stats
// *5 calc the sha1 of file and set to this.fis.[idx].sha1
// *6 in express, you can call res.render here! Life is so beautiful...
//    here, we log it to console. codes in here nothing about `continue.js`, 
