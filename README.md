# Angular Fun - Mimosa
*[Original By Cary Landholt](https://github.com/CaryLandholt/AngularFun)*

*Translated from Grunt to Mimosa*

## About
* This is an attempt to play with the features of [AngularJS](http://angularjs.org/) and leverage the goodness of [RequireJS](http://requirejs.org/)
* Uses controllers, services, directives, filters, and partials
* Takes advantage of Mimosa's mimimal configuration and built in RequireJS functionality.

## Prerequisites
* [node.js (at least v0.8.1)](http://nodejs.org/)
* Mimosa
  * `npm install -g mimosa`

## Install Angular Fun

    $ git clone git://github.com/dbashford/AngularFun.git
    $ cd AngularFun
    $ npm install

## Run Angular Fun

Run Mimosa's watcher with the server turned on.

    $ mimosa watch --server

This will 1) watch your directory structure and compile things on the fly and 2) run a server at port 3000 so you can view your application 3) serve the assets gzipped and 4) reload the application whenever something successfully compiles (live reload).  This will do it without optimizations and this with optimizations:

    $ mimosa watch --server --optimize

r.js minification is currently not working properly, likely due to a bug in uglify since it works fine with optimization turned off.