pragma solidity ^0.5.16;

contract DeviceRegistry {
    struct Device {
        address owner;
        bytes Pid;
        bool registered;
    }

    mapping(string => Device) public devices;

    event DeviceRegistered(string deviceId, address owner, bytes Pid);
    event DeviceAuthenticated(string deviceId, address owner);

    modifier onlyOwner(string memory deviceId) {
        require(devices[deviceId].owner == msg.sender, "Not the device owner");
        _;
    }

    function registerDevice(string calldata deviceId, bytes calldata Pid) external {
        require(!devices[deviceId].registered, "Device already registered");

        devices[deviceId] = Device({
            owner: msg.sender,
            Pid: Pid,
            registered: true
        });

        emit DeviceRegistered(deviceId, msg.sender, Pid);
    }

    function authenticateDevice(string calldata deviceId, bytes calldata Pid) external onlyOwner(deviceId) {
        emit DeviceAuthenticated(deviceId, msg.sender);
    }
}
