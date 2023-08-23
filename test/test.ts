import { expect } from "chai";
import { ethers } from "hardhat";
import {StandardMerkleTree} from "@openzeppelin/merkle-tree";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers"
import * as fs from "fs";

describe("EarlyAccessNFT", function () {

  async function deployContract() {
    const [_, otherAccount] = await ethers.getSigners();

    const secrets = [
      [ethers.encodeBytes32String("never gonna give you up")],
      [ethers.encodeBytes32String("never gonna let you down")],
      [ethers.encodeBytes32String("never gonna run around")],
    ];

    const tree = StandardMerkleTree.of(secrets, ["bytes32"]);

    const nft = await ethers.deployContract("EarlyAccessNFT", [tree.root, 2]);
    await nft.waitForDeployment();
    return { nft, tree, secrets, otherAccount }
  }

  it("Test contract", async function () {
    const { nft, tree } = await loadFixture(deployContract)
    fs.writeFileSync("tree.json", JSON.stringify(tree.dump()));
    expect(await nft.name()).to.equal("EarlyAccessNFT");
    expect(await nft.merkleRoot()).to.equal(tree.root);
    expect(await nft.paused()).to.equal(false);
    expect(await nft.totalSupply()).to.equal(0);
  });

  it('Test merkle mint', async function () {
    const { nft, tree, secrets, otherAccount } = await loadFixture(deployContract)

    expect(await nft.merkleRoot()).to.equal(tree.root);

    const proof = tree.getProof([secrets[0][0]]);
    const response = await nft.mint(otherAccount, proof, secrets[0][0]);
    const tokenId = response.value
    expect(await nft.balanceOf(otherAccount)).to.equal(1);
    expect(await nft.ownerOf(tokenId)).to.equal(otherAccount.address);
    expect(await nft.totalSupply()).to.equal(1);
  });

  it('Test merkle mint non-owner', async function () {
    const { nft, tree, secrets, otherAccount } = await loadFixture(deployContract)

    expect(await nft.merkleRoot()).to.equal(tree.root);

    const proof = tree.getProof([secrets[0][0]]);
    const response = await nft.connect(otherAccount).mint(otherAccount, proof, secrets[0][0]);
    const tokenId = response.value
    expect(await nft.balanceOf(otherAccount)).to.equal(1);
    expect(await nft.ownerOf(tokenId)).to.equal(otherAccount.address);
    expect(await nft.totalSupply()).to.equal(1);
  });

  it("Test non-transferable", async function () {
    const { nft, tree, secrets, otherAccount } = await loadFixture(deployContract)

    const proof = tree.getProof([secrets[0][0]]);
    const response = await nft.mint(otherAccount, proof, secrets[0][0]);
    const tokenId = response.value

    await expect(nft.connect(otherAccount).transferFrom(otherAccount, otherAccount, tokenId))
        .to.be.revertedWith('EarlyAccessNFT: transfers are not allowed');
  });

  it("Test mint on pause", async function () {
    const { nft, tree, secrets, otherAccount } = await loadFixture(deployContract)

    await nft.pause();
    expect(await nft.paused()).to.equal(true);
    expect(nft.mint(otherAccount, tree.getProof([secrets[0][0]]), secrets[0][0])).to.be.revertedWith("Pausable: paused")
    expect(await nft.claimed(secrets[0][0])).to.equal(false)

    await nft.unpause();
    expect(await nft.paused()).to.equal(false);
    await nft.mint(otherAccount, tree.getProof([secrets[0][0]]), secrets[0][0]);
    expect(await nft.claimed(secrets[0][0])).to.equal(true)
    expect(await nft.balanceOf(otherAccount)).to.equal(1);
    expect(await nft.totalSupply()).to.equal(1);
  });

  it("Test mint more than one", async function () {
    const { nft, tree, secrets, otherAccount } = await loadFixture(deployContract)

    await nft.connect(otherAccount).mint(otherAccount, tree.getProof([secrets[0][0]]), secrets[0][0]);
    expect(nft.connect(otherAccount).mint(otherAccount, tree.getProof([secrets[0][0]]), secrets[0][0])).to.be.revertedWith("EarlyAccessNFT: already claimed");

    await nft.connect(otherAccount).mint(otherAccount, tree.getProof([secrets[1][0]]), secrets[1][0]);
    expect(await nft.balanceOf(otherAccount)).to.equal(2);
    expect(await nft.totalSupply()).to.equal(2);
  });


  it("Test mint more than maxSupply", async function () {
    const { nft, tree, secrets, otherAccount } = await loadFixture(deployContract)

    await nft.connect(otherAccount).mint(otherAccount, tree.getProof([secrets[0][0]]), secrets[0][0]);
    await nft.connect(otherAccount).mint(otherAccount, tree.getProof([secrets[1][0]]), secrets[1][0]);
    await expect(nft.connect(otherAccount).mint(otherAccount, tree.getProof([secrets[2][0]]), secrets[2][0])).to.be.revertedWith("EarlyAccessNFT: max supply reached");

  });

});
