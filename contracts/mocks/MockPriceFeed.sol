// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockPriceFeed
 * @notice Mock Chainlink aggregator for testing
 */
contract MockPriceFeed {
    int256 public price;
    uint8 public decimals;
    uint256 public updatedAt;
    string public description;

    constructor(int256 _price, uint8 _decimals, string memory _description) {
        price = _price;
        decimals = _decimals;
        description = _description;
        updatedAt = block.timestamp;
    }

    function setPrice(int256 _price) external {
        price = _price;
        updatedAt = block.timestamp;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 _updatedAt,
            uint80 answeredInRound
        )
    {
        return (1, price, block.timestamp, updatedAt, 1);
    }
}
