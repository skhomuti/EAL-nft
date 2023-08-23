// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

contract EarlyAccessNFT is ERC721, ERC721Enumerable, Pausable, Ownable {
    using Counters for Counters.Counter;
    bytes32 private _merkleRoot;
    uint256 private immutable _maxSupply;
    mapping(bytes32 => bool) private claimedLeafs;

    constructor(bytes32 root, uint32 maxSupply) ERC721("EarlyAccessNFT", "EAL") {
        _merkleRoot = root;
        _maxSupply = maxSupply;
    }

    Counters.Counter private _tokenIdCounter;

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function merkleRoot() public view returns (bytes32) {
        return _merkleRoot;
    }

    function claimed(bytes32 leaf) public view returns (bool) {
        return claimedLeafs[leaf];
    }

    function mint(address to, bytes32[] calldata merkleProof, bytes32 leaf) public returns (uint256) {
        require(claimedLeafs[leaf] == false, "EarlyAccessNFT: already claimed");
        require(MerkleProof.verify(merkleProof, _merkleRoot, keccak256(bytes.concat(keccak256(abi.encode(leaf))))) == true, "invalid merkle proof");

        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(to, tokenId);

        _tokenIdCounter.increment();
        claimedLeafs[leaf] = true;
        return tokenId;
    }

    function _beforeTokenTransfer(address from, address to, uint256 firstTokenId, uint256 batchSize)
    internal
    whenNotPaused
    override(ERC721, ERC721Enumerable)
    {
        require(_tokenIdCounter.current() + batchSize <= _maxSupply, "EarlyAccessNFT: max supply reached");
        require(from == address(0) || to == address(0), "EarlyAccessNFT: transfers are not allowed");
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721, ERC721Enumerable)
    returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

}