# Angular Fun
*By Cary Landholt*

*Translated to Mimosa by David Bashford*

## About
* This is an attempt to play with the features of [AngularJS](http://angularjs.org/) and leverage the goodness of [RequireJS](http://requirejs.org/)
* Uses controllers, services, directives, filters, and partials

## Prerequisites
* Must have [Git](http://git-scm.com/) installed
* Must have [node.js (at least v0.8.1)](http://nodejs.org/) installed with npm (Node Package Manager)
* Install the following Node.js modules via the terminal.  This is a one-time task as the `-g` switch will install the modules globally.
  * `npm install -g mimosa`

## Install Angular Fun

    $ git clone git://github.com/dbashford/AngularFun.git
    $ cd AngularFun
    $ npm install

## Run Angular Fun

Run Mimosa's watcher with the server turned on.  This will 1) watch your directory structure and compile things on the fly and 2) run a server at port 3000 so you can view your application 3) serve the assets gzipped and 4) reload the application whenever something successfully compiles (live reload).  This will do it without optimizations...

    $ mimosa watch --server

...and this with optimizations

    $ mimosa watch --server --optimize
