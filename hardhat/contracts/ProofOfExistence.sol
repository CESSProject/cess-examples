// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract ProofOfExistence {
  mapping(bytes32 => address) public files;
  mapping(address => bytes32[]) public users;

  event Claimed(address indexed owner, bytes32 indexed file);
  event Forfeited(address indexed owner, bytes32 indexed file);

  error NotFileOwner();
  error FileAlreadyClaimed();

  modifier isOwner(bytes32 hash) {
    address from = msg.sender;
    if (files[hash] != from) revert NotFileOwner();
    _;
  }

  modifier notClaimed(bytes32 hash) {
    address from = msg.sender;
    if (files[hash] != address(0)) revert FileAlreadyClaimed();
    _;
  }

  function hasClaimed(bytes32 hash) public view returns (bool) {
    address owner = files[hash];
    return (owner != address(0));
  }

  function ownedFiles() public view returns (bytes32[] memory) {
    address from = msg.sender;
    return users[from];
  }

  function claim(bytes32 hash) public notClaimed(hash) returns (bool) {
    address from = msg.sender;

    // update storage files
    files[hash] = from;

    // update storage users
    bytes32[] storage userFiles = users[from];
    userFiles.push(hash);

    emit Claimed(from, hash);
    return true;
  }

  function forfeit(bytes32 hash) public isOwner(hash) returns (bool) {
    address from = msg.sender;

    // update storage files
    delete files[hash];

    // locate the index of the file going to be deleted.
    bytes32[] storage userFiles = users[from];
    uint32 delIdx = 0;
    for (uint32 i = 0; i < userFiles.length; i++) {
      if (userFiles[i] == hash) {
        delIdx = i;
        break;
      }
    }
    // update storage users by swap-delete
    if (delIdx != userFiles.length - 1) {
      userFiles[delIdx] = userFiles[userFiles.length - 1];
    }
    // delete
    userFiles.pop();

    emit Forfeited(from, hash);
    return true;
  }
}
