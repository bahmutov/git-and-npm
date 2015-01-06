var _ = require('lodash');
var q = require('q');
q.longStackSupport = true;

var check = require('check-more-types');
check.mixin(function (url) {
  return check.unemptyString(url) &&
    /^git@/.test(url);
}, 'git');

var verify = check.verify;
var ggit = require('ggit');
var cloneRepo = ggit.cloneRepo;
var exec = require('ggit').exec;
var path = require('path');
var fs = require('fs');
var tmpdir = require('os').tmpdir;
var pkg = require('../package.json');
var chdir = require('chdir-promise');
var quote = require('quote');
// var release = require('release-it').execute;

function verifyRepo(repo) {
  verify.unemptyString(repo, 'expected github repo string');
  var usernameReponameRegexp = /[\w]+\/[\w]+/;
  la(usernameReponameRegexp.test(repo),
    'Expected github username / repo name string, have', repo);
}

function cleanupTempFolder(folder) {
  verify.unemptyString(folder, 'expected folder name');
  if (fs.existsSync(folder)) {
    require('rimraf').sync(folder);
    console.log('removed temp local folder', quote(folder));
  }
}

function installDependencies(folder) {
  verify.unemptyString(folder, 'expected folder name');
  console.log('installing dependencies', folder);

  var npmInstall = exec.bind(null, 'npm install');
  var message = console.log.bind(console, 'installed dependencies in', folder);

  return chdir.to(folder)
    .then(npmInstall)
    .then(message)
    .finally(chdir.back);
}

// returns tmp folder for given repo
// repoName: smith/foo for example
function folderForRepo(repoName) {
  la(check.unemptyString(repoName), 'missing repo name', repoName);

  var tmp = path.join(tmpdir(), pkg.name, repoName);
  if (!fs.existsSync(tmp)) {
    require('mkdirp').sync(tmp);
    console.log('Created folder to clone', repoName, 'to');
  }
  console.log(repoName);

  return tmp;
}

function repoNameToUrl(repo) {
  return 'git@github.com:' + repo + '.git';
}

function cloneAndInstall(repo) {

  var repoUrl = repoNameToUrl(repo);
  la(check.git(repoUrl), 'could not convert', repo, 'to git url', repoUrl);

  var tmpFolder = folderForRepo(repo);
  la(check.unemptyString(tmpFolder), 'missing tmp folder for repo', repo);

  var clone = cloneRepo.bind(null, {
    url: repoUrl,
    folder: tmpFolder
  });
  var install = installDependencies.bind(null, tmpFolder);

  return q(cleanupTempFolder(tmpFolder))
    .then(clone)
    .then(function () {
      console.log('cloned', repo, 'to', tmpFolder);
    })
    .then(install)
    .then(function () {
      console.log('tested npm module in', tmpFolder);
      return tmpFolder;
    }, function (err) {
      console.log('FAILED test for npm module in', tmpFolder);
      if (err) {
        console.log('==================');
        console.log(err);
        console.log('==================');
      }
      cleanupTempFolder(tmpFolder);
      throw new Error(err);
    });
}

module.exports = cloneAndInstall;
