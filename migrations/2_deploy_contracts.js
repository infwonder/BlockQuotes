var StringMapper = artifacts.require("./StringMapper.sol");
var strings = artifacts.require("./strings.sol");

module.exports = function(deployer) {
  deployer.deploy(strings);
  deployer.link(strings, StringMapper);
  deployer.deploy(StringMapper);
};
