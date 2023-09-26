// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

contract Flipper {
  bool public value;

  constructor(bool init_value) {
    value = init_value;
  }

  function flip() public {
    value = !value;
  }
}
