import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("MyToken", function () {
  it("Test contract", async function () {
    const ContractFactory = await ethers.getContractFactory("MyToken");

    const instance = await upgrades.deployProxy(ContractFactory);
    await instance.waitForDeployment();

    expect(await instance.name()).to.equal("MyToken");
  });
});
