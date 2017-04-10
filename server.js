'use strict';
const Web3 = require("web3");
var Contract = require("truffle-contract");
var StrMapObj = require( __dirname + '/build/contracts/StringMapper.json');
var MigrationsObj = require( __dirname + '/build/contracts/Migrations.json');

var StrMapCtr = Contract(StrMapObj);
var Migrations = Contract(MigrationsObj);

var web3;

// Supports Mist, and other wallets that provide 'web3'.
if (typeof web3 !== 'undefined') {
    // Use the Mist/wallet provider.
    web3 = new Web3(web3.currentProvider);
} else {
    // Use the provider from the config.
    web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
}

StrMapCtr.setProvider(web3.currentProvider);
Migrations.setProvider(web3.currentProvider);

console.log(web3.eth.accounts);

// MAIN

const EthUtil = require("ethereumjs-util");
var express = require("express");
var bodyParser = require('body-parser');
var handlebars = require("express-handlebars")
      .create( 
        { 
           defaultLayout: 'main',
           helpers: 
             {
               inc: function(val, opt) { return parseInt(val) + 1; },
               dec: function(val, opt) { return parseInt(val) - 1; },
             }
        });
var http = require("http");

var app = express();
app.engine('hds', handlebars.engine);
app.set('view engine', 'hds');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

function catchedError(response, error) {
  response.status(500);
  response.render("500", {"error": error});
}

StrMapCtr.deployed().then( (StrMapIns) =>
{

// Top page
  app.get('/', function(request, response) 
  {
    response.render("index");
  });

// Dump data (paging will be added)
  app.get('/kvstore', function(request, response) 
  {
    var thispage = request.query.page || 1;

    StrMapIns.itemcount().then((ic) => { 
      if (ic == 0) response.redirect(303, '/addkey');

      // with itemcount (ic), we can now do pages;
      // let's set defult of 16 items per page;
      var start = (thispage-1)*16;
      var end   = start+16-1;
      var firstpage = false; var lastpage = false;

      if (start == 0) firstpage = true;
      if (end >= ic) lastpage = true;

      if (start > ic) catchedError(response, 'Invalid page number ' + thispage);

      StrMapIns.dumpData(start, end).then((items) => 
      {
        var a = []; var id = 0;
        items.map( (p) => 
        {
          a.push({'id': id + start, 'key': web3.toUtf8(p[0]), 'hash': web3.toHex(web3.toBigNumber(p[1])), 'value': web3.toUtf8(p[2])});
          id++;
        });
    
        return a;
      }).then((array) => 
      {
        response.render('kvstore', {kvlist: array, start: start, end: end, page: thispage, firstpage: firstpage, lastpage: lastpage});
      });
    });
  });

// Query key, or redirect to add it if not found
  app.post('/querykey', function(request, response) 
  {
    var thiskey = request.body.keystr;
    StrMapIns.getValue(thiskey).then((value) => 
    {
      if (value == '') { 
        response.render('addkv', {key: thiskey});
      } else {
        var array = [{key: thiskey, hash: web3.sha3(thiskey), value: value}];
        response.render('result', {kvlist: array});
      }
    });
  });

// Add new key
  app.get('/addkey', function(request, response) 
  {
    response.render('addkv', {key: ''});
  });

  app.post('/addkey', function(request, response) 
  {
    var thiskey = request.body.keystr;
    var thisval = request.body.valstr;

    StrMapIns.addKeyValue(thiskey, thisval, {from: web3.eth.accounts[0]}).then((result) => 
    {
      if (result.receipt.blockNumber === null) {
        var err = 'Transaction ' + result.tx + ' failed ...';
        throw(err);
      }
      
      var array = [{key: thiskey, hash: web3.sha3(thiskey), value: thisval}]; // for speed sake, but probably not right...
      response.render('result', {kvlist: array});
    })
    .catch((err) => { catchedError(response, err); });
    
  });

// About page
  app.get('/about', function(request, response)
  {
    var contractAddr = StrMapIns.address;
    response.render("about", { contract_address: contractAddr });
  });

  app.use(function(error, request, response, next) {
   catchedError(response, error);
  });

// Start it up!
  http.createServer(app).listen(8080);
});
