// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract Flipper {
  bool public value;

  constructor(bool initValue) {
    value = initValue;
  }

  function flip() public {
    value = !value;
  }
}
