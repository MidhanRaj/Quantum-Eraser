// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title WipeLog
 * @dev Stores immutable records of secure erasure events for audit trails.
 */
contract WipeLog {
    struct Entry {
        string fileName;
        uint256 timestamp;
        address wallet;
        string algo;
    }

    Entry[] public logs;

    event LogAdded(string fileName, uint256 timestamp, address indexed wallet, string algo);

    /**
     * @dev Records a new erasure event.
     * @param _fileName Name of the file that was wiped.
     * @param _algo Algorithm used for the wipe.
     */
    function addLog(string memory _fileName, string memory _algo) public {
        logs.push(Entry(_fileName, block.timestamp, msg.sender, _algo));
        emit LogAdded(_fileName, block.timestamp, msg.sender, _algo);
    }

    /**
     * @dev Returns the total number of logs recorded.
     */
    function getLogCount() public view returns (uint256) {
        return logs.length;
    }

    /**
     * @dev Returns all logs in a single call.
     */
    function getAllLogs() public view returns (Entry[] memory) {
        return logs;
    }
}
