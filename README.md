## 0. Requirements: 
 - nodejs 6.x,
 - bower
 - truffle 3.2.1, 
 - ethereumjs-testrpc (or geth), 
 - ipfs

After checking out from GitHub, in the source code root dir, run:

      npm install
      cd bower && bower install

##  1. Need to enable IPFS CORS access: 

       ipfs init
       ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
       ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "GET", "POST"]'
       ipfs config --json API.HTTPHeaders.Access-Control-Allow-Credentials '["true"]'
       ipfs daemon

## 2. Then start testrpc (have not yet tried it on geth), e.g.:

    testrpc --account="0x2730882e11b0d5a44bd748e3bae3f07d0cc2634c5cc7804c74f4ca0a952ecf82,1000000000000000000000000000000000" --account="0xcc575e9e49f1d9fbc3bf7b19270c9d9d8fe3b61123819d347e5c3bd86c5082e2,100000000000000000000000000000000000" --account="0xd9b6939ace994513fb1ce77b0c58d6d969d6b102decc575f50544f2a833da54d,100000000000000000000000000" --port 8545

## 3. Running Truffle: 
##### (assuming testrpc / geth rpc api listening on localhost:8545)

       truffle migreate --reset && truffle build

## 4. Start BlockQuotes: (listening on tcp port 8081 since ipfs took port 8080)

       npm start

then use browser (only tested with Firefox) to open localhost:8081


#### License: GPL v3
##### Background image taken from [blog.ethereum.org](https://blog.ethereum.org/2015/03/14/ethereum-the-first-year/)
