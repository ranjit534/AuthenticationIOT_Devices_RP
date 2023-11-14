var DeviceManager = artifacts.require("./DeviceRegistry.sol");

module.exports = function(deployer) {
  deployer.deploy(DeviceManager);
};