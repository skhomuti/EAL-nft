// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "hardhat/console.sol";

contract EarlyAccessNFT is ERC721, Pausable, Ownable {
    using Counters for Counters.Counter;
    bytes32 private _merkleRoot;

    constructor() ERC721("EarlyAccessNFT", "EAL") {}

    bool private _isTransferable = false;
    Counters.Counter private _tokenIdCounter;

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function safeMint(address to, uint256 tokenId) public onlyOwner {
        _safeMint(to, tokenId);
    }

    function setTransferable(bool isTransferable) public onlyOwner {
        _isTransferable = isTransferable;
    }

    function transferable() public view returns (bool) {
        return _isTransferable;
    }

    function mint(address to, bytes32[] calldata merkleProof, bytes32 leaf) public onlyOwner returns (uint256) {
        require(balanceOf(to) == 0, "already claimed");
        require(MerkleProof.verify(merkleProof, _merkleRoot, keccak256(bytes.concat(keccak256(abi.encode(leaf))))) == true, "invalid merkle proof");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        return tokenId;
    }

    function setMerkleRoot(bytes32 root) public onlyOwner {
        _merkleRoot = root;
    }

    function merkleRoot() public view returns (bytes32) {
        return _merkleRoot;
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
    internal
    whenNotPaused
    override
    {
        if (!_isTransferable) {
            // burn or mint only
            require(from == address(0) || to == address(0), "EarlyAccessNFT: transfers are not allowed");
        }
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
}