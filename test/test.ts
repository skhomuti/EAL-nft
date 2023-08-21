import { expect } from "chai";
import { ethers } from "hardhat";
import {StandardMerkleTree} from "@openzeppelin/merkle-tree";
import { ContractTransactionResponse } from "ethers";
import {EarlyAccessNFT} from "../typechain-types";
import {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/signers";

describe("EarlyAccessNFT", function () {
  let owner: HardhatEthersSigner;
  let otherAccount: HardhatEthersSigner;
  let instance: EarlyAccessNFT & { deploymentTransaction(): ContractTransactionResponse; };

  before(async function () {
    const ContractFactory = await ethers.getContractFactory("EarlyAccessNFT");
    [owner, otherAccount] = await ethers.getSigners();

    instance = await ContractFactory.deploy();
    await instance.waitForDeployment();
  });

  it("Test contract", async function () {
    expect(await instance.name()).to.equal("EarlyAccessNFT");
  });

  it('Test merkle mint', async function () {
    const secrets = [
      [ethers.encodeBytes32String("never gonna give you up")],
      [ethers.encodeBytes32String("never gonna let you down")],
    ];

    const tree = StandardMerkleTree.of(secrets, ["bytes32"]);

    await instance.setMerkleRoot(tree.root);
    expect(await instance.merkleRoot()).to.equal(tree.root);
    const proof = tree.getProof([secrets[0][0]]);
    const response = await instance.mint(otherAccount, proof, secrets[0][0]);
    const tokenId = response.value
    expect(await instance.balanceOf(otherAccount)).to.equal(1);
    expect(await instance.ownerOf(tokenId)).to.equal(otherAccount.address);
  });

  it("Test non-transferable", async function () {
    expect(await instance.transferable()).to.equal(false);

    expect(await instance.connect(otherAccount).transferFrom(otherAccount, otherAccount, 0))
        .to.be.revertedWith('EarlyAccessNFT: transfers are not allowed');

    await expect(instance.connect(otherAccount).transferFrom(otherAccount, otherAccount, 0))
        .to.be.revertedWith('EarlyAccessNFT: transfers are not allowed');
  });

});
