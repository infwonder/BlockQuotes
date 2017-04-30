'use strict';
const fs = require('fs');
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

console.log(web3.eth.accounts);

// Hooking up to IPFS
ipfs.setProvider(require("ipfs-api")('localhost','5001'));

ipfs.add(fs.readFileSync(__dirname + '/misc/BlockQuotes_Intro_text.txt'), (err, thash) => 
{
  if(err) throw(err);

  var txthash = thash; console.log("thash: " + txthash);
  ipfs.add(fs.readFileSync(__dirname + '/misc/BlockQuotes_Intro_picture.durl'), (err, phash) => 
  {
    if(err) throw(err);

    var pichash;
    pichash = phash; console.log("phash: " + pichash);

    StrMapCtr.deployed().then((r) => 
    { 
      var s = r 
      s.becomeMember({from: web3.eth.accounts[2], value: web3.toWei(3, 'ether')}).then((results) => 
      {
        s.addKeyValue('BlockQuotes: An Introduction', txthash, pichash, 2, {from: web3.eth.accounts[2], gas: 600000}).then((results) => 
        {
          var hash = web3.sha3('BlockQuotes: An Introduction');
          var comment = "Currenly BlockQuotes only support Firefox ...";
          var recipient = web3.eth.accounts[2];
          s.addReply(hash, comment, web3.toWei(0.1, 'ether'), recipient, {from: web3.eth.accounts[2], gas: 600000}).then((result) =>
          {
            console.log("done!");
          });
        });
      });
    });
  });
});


