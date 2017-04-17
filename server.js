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
          var d = new Date(0);
          d.setUTCSeconds(web3.toDecimal(web3.toBigNumber(p[5])));

          var ts = ''; [p[0], p[1], p[2], p[3]].map( (i) => { ts += web3.toUtf8(i); });

          a.push({'id': id + start, 'title': ts, 'hash': web3.toHex(web3.toBigNumber(p[4])), 'date': d, 'author': web3.toHex(web3.toBigNumber(p[6]))});
          id++;
        });
    
        return a;
      }).then((array) => 
      {
        response.render('kvstore', {kvlist: array, start: start, end: end, page: thispage, firstpage: firstpage, lastpage: lastpage});
      });
    });
  });

  app.get('/post/:phash', function(request, response) 
  {
    var thispage = request.query.page || 1;
    var key = request.params.phash;

    StrMapIns.getValueByHash(key).then((results) => 
    {
      var d = new Date(0);
      d.setUTCSeconds(web3.toDecimal(web3.toBigNumber(results[0])));

      StrMapIns.getReplyCount(key).then((c) => 
      {
        c = web3.toDecimal(c);
        if (c == 0) { 
          response.render('post', {'hash': key, 'comment': false, 'date': d, 'author': results[2], 'value': results[1]});
        } else {

          var start = (thispage-1)*16;
          var end   = start+16-1;
          var firstpage = false; var lastpage = false;

          if (start == 0) firstpage = true;
          if (end >= c) lastpage = true;
  
          if (start > c) catchedError(response, 'Invalid page number ' + thispage);

          StrMapIns.getReply(key, start, end).then((items) => 
          {
            var a = []; var id = 0;
            items.map( (p) => 
            {
              var rd = new Date(0);
              rd.setUTCSeconds(web3.toDecimal(web3.toBigNumber(p[4])));

              var ts = ''; [p[0], p[1], p[2], p[3]].map( (i) => { ts += web3.toUtf8(i); });

              a.push({'id': id + start, 'reply': ts, 'date': rd, 'author': web3.toHex(web3.toBigNumber(p[5]))});
              id++;
            });

            return a;
          }).then((array) => 
            {
              response.render('post', 
                { 
                  rvlist: array, 
                  page: thispage, 
                  firstpage: firstpage, 
                  lastpage: lastpage, 
                  comment: true, 
                  date: d, 
                  author: results[2], 
                  value: results[1], 
                  hash: key
                });
          }); 
       }
     });
    }).catch((err) => { catchedError(response, err); });
  });

  app.get('/reply/:phash', function(request, response) 
  {
    var hash = request.params.phash; // need validation!
    response.render('reply', {'hash': hash});
  });

  app.post('/reply/:phash', function(request, response) 
  {
    var hash = request.params.phash; // need validation!
    var comment = request.body.thisrc;

    StrMapIns.addReply(hash, comment, {from: web3.eth.accounts[1], gas: 400000}).then((result) => 
    {
      if (result.receipt.blockNumber === null) {
        var err = 'Transaction ' + result.tx + ' failed ...';
        throw(err);
      }

      response.redirect(303, '/post/' + hash);
    }).catch((err) => { catchedError(response, err); });
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

    StrMapIns.addKeyValue(thiskey, thisval, {from: web3.eth.accounts[1], gas: 400000}).then((result) => 
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
  http.createServer(app).listen(8081);
});
