'use strict';
const Web3 = require("web3");
const ipfs = require("ipfs-js");
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

console.log("ETH coinbase: " + web3.eth.coinbase);

// Hooking up to IPFS
ipfs.setProvider(require("ipfs-api")('localhost','5001'));

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

function catchedError(response, error) 
{
  response.status(500);
  response.render("500", {"error": error});
}

String.prototype.replaceAll = function(search, replacement) 
{
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

String.prototype.toAddress = function(hashtype) 
{
    var pl;
    if (hashtype === 'wallet') { 
      pl = 42; 
    } else if (hashtype === 'sha3') {
      pl = 66;
    } else {
      throw('Invalid hashtype!');
    }

    var addr = String(web3.toHex(web3.toBigNumber(this)));
    if (addr.length === pl) return addr
    var pz = pl - addr.length;
    addr = addr.replace('0x', '0x' + '0'.repeat(pz));
    return addr;
};

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

      console.log("itemcount: " + ic + " start: " + start + " end: " + end);

      StrMapIns.dumpData(start, end).then((items) => 
      {
        var a = []; var id = 0;
        items.map( (p) => 
        {
          var d = new Date(0);
          d.setUTCSeconds(web3.toDecimal(web3.toBigNumber(p[5])));

          var ts = ''; [p[0], p[1], p[2], p[3]].map( (i) => { ts += web3.toUtf8(i); });

          a.push({'id': id + start, 'title': ts, 'hash': p[4].toAddress('sha3'), 'date': d, 'author': p[6].toAddress('wallet')});
          id++;
        });
    
        return a;
      }).then((array) => 
      {
        StrMapIns.checkMembership(web3.eth.coinbase).then((result) => {
          var hdbobj = {
                coinbase: web3.eth.coinbase,
             member_type: result[0] ? 'paid (Thank You!)' : 'free',
                 balance: web3.fromWei(result[1],'ether'),
                  kvlist: array, 
                   start: start, 
                     end: end, 
                    page: thispage, 
               firstpage: firstpage, 
                lastpage: lastpage
          };
          response.render('kvstore', hdbobj); 
        }).catch((err) => { catchedError(response, err); });
      }).catch((err) => { catchedError(response, err); });
    }).catch((err) => { catchedError(response, err); });
  });

  app.post('/entrance', function(request, response) 
  {
    StrMapIns.checkMembership(web3.eth.coinbase).then((result) => 
    {
      console.log("checking ... ");
      if (result[0] === true) {
        response.redirect(303, '/kvstore'); 
      } else {
        response.render('member', {coinbase: web3.eth.coinbase});
      }
    }).catch((err) => { catchedError(response, err); });
  });

  app.post('/join', function(request, response) 
  {
    var fund = request.body.payment;

    StrMapIns.becomeMember({from: web3.eth.coinbase, value: web3.toWei(fund, 'ether')}).then((result) => 
    {
      if (result.receipt.blockNumber === null) {
        var err = 'Transaction ' + result.tx + ' failed ...';
        throw(err);
      }

      response.redirect(303, '/kvstore'); 
    }).catch((err) => { catchedError(response, err); });
  });

  app.get('/post/:phash', function(request, response) 
  {
    console.log("called post");
    var thispage = request.query.page || 1;
    var key = request.params.phash;
    var viewer = web3.eth.coinbase;
 
    console.log("key: " + key);

    StrMapIns.getValueByHash(key).then((results) => 
    {
      console.log(JSON.stringify(results, null, 2));
      var d = new Date(0);
      var ipfshash = results[1]; console.log("ipfs: " + ipfshash);
      d.setUTCSeconds(web3.toDecimal(web3.toBigNumber(results[0])));

      // loading other media ipfs hashs, if any.
      var ipfslist = [];
      if (results[4] > 1) {
        var imhashs = results[5];
        imhashs.map((p) => 
        {
          ipfslist.push( {'ihash': web3.toUtf8(p[0]) + web3.toUtf8(p[1])} );
        });
      }

      ipfs.cat(ipfshash, (err, buf) => 
      {
        if (err) throw(err);

        var thisval = buf.toString(); var aaa = [];
        thisval.split(/\n\r|\n|\r/).map((i) => {
        //  console.log("get i = " + i + "|"); 
          if (!i) i = '\\n';
          i = i.replaceAll("'", "\\'");
          i = i.replaceAll(";", "\\;");
          aaa.push(i); 
        });
        aaa = aaa.join('\\n');
        // console.log(aaa);
         
        StrMapIns.getReplyCount(key).then((c) => 
        {
          c = web3.toDecimal(c);
  
          if (c == 0) {
            var hdbobj = {title: results[3], hash: key, comment: false, date: d, author: results[2], value: aaa};
            if (viewer === results[2]) hdbobj['can_delete'] = true;
            if (ipfslist) hdbobj['ipfslist'] = ipfslist;
            response.render('post', hdbobj);
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
                var hdbobj = { 
                    rvlist: array, 
                    page: thispage, 
                    firstpage: firstpage, 
                    lastpage: lastpage, 
                    comment: true, 
                    date: d, 
                    author: results[2], 
                    value: aaa, 
                    hash: key,
                    title: results[3],
                };

                if (viewer === results[2]) hdbobj['can_delete'] = true;
                if (ipfslist) hdbobj['ipfslist'] = ipfslist;                

                response.render('post', hdbobj);
            }); 
         }
       });
      });


    }).catch((err) => { catchedError(response, err); });
  });

  app.get('/delete/:phash', function(request, response) 
  {
     var hash = request.params.phash; // need validation!
     console.log('deleting post ' + hash + ' ...');
   
     StrMapIns.getIdByHash(hash).then((results) => 
     {
       console.log('checking authorship ...');
       var author = results[1].toAddress('wallet');
       if (web3.eth.coinbase == author) {
         console.log('Is author!');
         var id = web3.toDecimal(results[0]);
         StrMapIns.delKeyValue(id, hash, {from: web3.eth.coinbase, gas: 600000}).then((results) => 
         {
            if (results.receipt.blockNumber === null) {
              var err = 'Transaction ' + results.tx + ' failed ...';
              throw(err);
            }
            console.log('Deleted...');
            response.redirect(303, '/kvstore');
         });
       } else {
         response.redirect(303, '/post/'+ hash); 
       }
     }).catch((err) => { catchedError(response, err); });
  });

  app.get('/reply/:phash', function(request, response) 
  {
    var hash = request.params.phash; // need validation!

    StrMapIns.checkMembership(web3.eth.coinbase).then((result) =>
    {
      console.log("checking ... ");
      if (result[0] === true) {
        StrMapIns.getValueByHash(hash).then((results) => 
        {
          var sendto = results[2].toAddress('wallet');
          var title  = results[3];
          response.render('reply', {'hash': hash, 'author': sendto, 'title': title });
        }).catch((err) => { catchedError(response, err) });
      } else {
        response.render('member', {coinbase: web3.eth.coinbase});
      }
    }).catch((err) => { catchedError(response, err); });
  });

  app.post('/reply/:phash', function(request, response) 
  {
    var hash = request.params.phash; // need validation!
    var comment = request.body.thisrc;
    var tips = request.body.amount;
    var recipient = request.body.sendto;

    StrMapIns.addReply(hash, comment, web3.toWei(tips, 'ether'), recipient, {from: web3.eth.coinbase, gas: 600000}).then((result) => 
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
    StrMapIns.checkMembership(web3.eth.coinbase).then((result) => 
    {
      console.log("checking ... ");
      if (result[0] === true) {
        response.render('addkv', {key: ''});
      } else {
        response.render('member', {coinbase: web3.eth.coinbase});
      }
    }).catch((err) => { catchedError(response, err); });

  });

  app.post('/addkey', function(request, response) 
  {
    console.log(JSON.stringify(request.body, null, 2));
    var thiskey = request.body.keystr;
    var texthash = request.body.valstr;
    var phcount = request.body.totalHashs; 
    var phlist = [];

    Object.keys(request.body).map( (i) => 
    { 
       if (i.match(/^ipfs-.*/)) {
         phlist.push(request.body[i]);
       }
    });

    var pichashs = phlist.join(',');

    console.log(pichashs);

    StrMapIns.addKeyValue(thiskey, texthash, pichashs, phcount, {from: web3.eth.coinbase, gas: 600000}).then( (result) => 
    {
      if (result.receipt.blockNumber === null) {
        var err = 'Transaction ' + result.tx + ' failed ...';
        throw(err);
      }
        
      var array = [{key: thiskey, hash: web3.sha3(thiskey), value: texthash}]; // for speed sake, but probably not right...
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
