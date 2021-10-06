const {constants,expectRevert,expectEvent,time,ether,BN} = require('@openzeppelin/test-helpers');
const {expect} = require('chai');
const Reverter = require('./utils/reverter');
const AbraToken = artifacts.require("AbraToken");
contract('AbraToken test', ([defaultAddress,wallet, user1,user2,user3]) => {
    const reverter = new Reverter(web3);
    let totalSupply = new BN("3000000000000000000000000000");
    before('setup', async () => {
        abraToken = await AbraToken.new(wallet,defaultAddress)
        await reverter.snapshot();
    })
    afterEach('revert', reverter.revert);
    describe('Check for correct deployment', async () => {
        it("Check properties of token", async () => {
            expect(await abraToken.name()).to.be.equal("Crypto Perx")
            expect(await abraToken.decimals()).to.be.bignumber.equal("18")
            expect(await abraToken.totalSupply()).to.be.bignumber.equal(totalSupply)
        })
        it("Check balance on addresses", async () => {
            expect(await abraToken.balanceOf(wallet)).to.be.bignumber.equal(totalSupply)
        })
        it("Check owner of token", async () => {
            expect(await abraToken.owner()).to.be.equal(defaultAddress)
        })
    })
    describe('Functions', async () => {
        describe('constructor', async () => {
            it("Must fail if try to set owner with zero addresss", async () => {
                await expectRevert(AbraToken.new(wallet,constants.ZERO_ADDRESS),"CPRX: incorrect owner address")
            })
            it("Must fail if try mint token to zero address", async () => {
                await expectRevert(AbraToken.new(constants.ZERO_ADDRESS,defaultAddress),"CPRX: incorrect wallet address")
            })
        })
        describe('transfer', async () => {
            it("Must fail if try to transfer to zero address", async () => {
                await expectRevert(abraToken.transfer(constants.ZERO_ADDRESS,1000,{from:wallet}),"ERC20: transfer to the zero address")
            })
            it("Must fail if try to transfer more than sender has", async () => {
                await expectRevert(abraToken.transfer(user1,totalSupply + 1,{from:wallet}),"ERC20: transfer amount exceeds balance")
            })
            it("Must transfer correctly", async () => {
                expect(await abraToken.balanceOf(wallet)).to.be.bignumber.equal(totalSupply)
                await abraToken.transfer(user1,1000,{from:wallet})
                expect(await abraToken.balanceOf(wallet)).to.be.bignumber.equal("2999999999999999999999999000")
                expect(await abraToken.balanceOf(user1)).to.be.bignumber.equal("1000")
                await abraToken.transfer(user2,500,{from:user1})
                expect(await abraToken.balanceOf(user1)).to.be.bignumber.equal("500")
                expect(await abraToken.balanceOf(user2)).to.be.bignumber.equal("500")
            })
        })
        describe('approve and transferFrom', async () => {
            it("Must fail if sender isn't approved", async () => {
                await expectRevert(abraToken.transferFrom(wallet,user1,1000,{from:wallet}),"ERC20: transfer amount exceeds allowance");
                await expectRevert(abraToken.transferFrom(wallet,user1,1000,{from:user1}),"ERC20: transfer amount exceeds allowance");
            })
            it("Must fail if sender exceeds allowance", async () => {
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal("0");
                await abraToken.approve(user1,1000,{from:wallet})
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal("1000");
                await expectRevert(abraToken.transferFrom(wallet,user1,1001,{from:user1}),"ERC20: transfer amount exceeds allowance");
            })
            it("Must tranferFrom correctly", async () => {
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal("0");
                let approveEventRes = await abraToken.approve(user1,1000,{from:wallet})
                expectEvent(approveEventRes,"Approval",{owner:wallet,spender:user1,value:"1000"})
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal("1000");
                expect(await abraToken.balanceOf(user1)).to.be.bignumber.equal("0")
                let transferEventRes = await abraToken.transferFrom(wallet,user1,1000,{from:user1})
                expect(await abraToken.balanceOf(user1)).to.be.bignumber.equal("1000")
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal("0");
                expectEvent(transferEventRes,"Transfer",{from:wallet,to:user1,value:"1000"})
            })
        })
        //increaseAllowance and decreaseAllowance
        describe('increaseAllowance and decreaseAllowance', async () => {
            it("Must fail if increase allowance more than max value of uint256 (overflow)", async () => {
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal("0");
                await abraToken.approve(user1,1000,{from:wallet})
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal("1000");
                await expectRevert(abraToken.increaseAllowance(user1,constants.MAX_UINT256,{from:wallet}),"revert")
            })
            it("Must fail if decrease allowance more than was approved (underflow)", async () => {
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal("0");
                await abraToken.approve(user1,1000,{from:wallet})
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal("1000");
                await expectRevert(abraToken.decreaseAllowance(user1,2000,{from:wallet}),"ERC20: decreased allowance below zero")
            })  
            it("Must increase allowance correctly", async () => {
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal("0");
                await abraToken.approve(user1,1000,{from:wallet})
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal("1000");
                await abraToken.increaseAllowance(user1,1000,{from:wallet})
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal("2000");
            }) 
            it("Must decrease allowance correctly", async () => {
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal("0");
                await abraToken.approve(user1,1000,{from:wallet})
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal("1000");
                await abraToken.decreaseAllowance(user1,500,{from:wallet})
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal("500");
            })
        })
        //burn
        describe('burn', async () => {
            it("Must fail if burn tokens more than user has", async () => {
                await expectRevert(abraToken.burn(1,{from:user1}),"ERC20: burn amount exceeds balance")
                await expectRevert(abraToken.burn(totalSupply+1,{from:wallet}),"ERC20: burn amount exceeds balance")
            })
            it("Must burn tokens correctly", async () => {
                expect(await abraToken.balanceOf(wallet)).to.be.bignumber.equal(totalSupply)
                let transferEventRes = await abraToken.burn(1000,{from:wallet})
                expect(await abraToken.balanceOf(wallet)).to.be.bignumber.equal("2999999999999999999999999000")
                expectEvent(transferEventRes,"Transfer",{from:wallet,to:constants.ZERO_ADDRESS,value:"1000"})
            })
        })
        //burnFrom
        describe('burnFrom', async () => {
            it("Must fail if sender try to burn more tokens than allowed", async () => {
                await expectRevert(abraToken.burnFrom(wallet,1000,{from:user1}),"ERC20: burn amount exceeds allowance")
            })
            it("Must fail if sender try to burn tokens from zero address", async () => {
                await expectRevert(abraToken.burnFrom(constants.ZERO_ADDRESS,0,{from:user1}),"ERC20: approve from the zero address")
            })
            it("Must fail if sender try to burn tokens from zero address", async () => {
                await expectRevert(abraToken.burnFrom(constants.ZERO_ADDRESS,1000,{from:user1}),"ERC20: burn amount exceeds allowance")
            })
            it("Must fail if sender try to burn more tokens than the address has", async () => {
                let burnTokenAmount = totalSupply + 1000;
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal("0");
                await abraToken.approve(user1,burnTokenAmount,{from:wallet})
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal(burnTokenAmount.toString());
                await expectRevert(abraToken.burnFrom(wallet,burnTokenAmount,{from:user1}),"ERC20: burn amount exceeds balance")
            })
            it("Must burnFrom correctly", async () => {
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal("0");
                await abraToken.approve(user1,1000,{from:wallet})
                expect(await abraToken.allowance(wallet,user1)).to.be.bignumber.equal("1000");
                expect(await abraToken.balanceOf(wallet)).to.be.bignumber.equal(totalSupply)
                await abraToken.burnFrom(wallet,1000,{from:user1})
                expect(await abraToken.balanceOf(wallet)).to.be.bignumber.equal("2999999999999999999999999000")
            })
        })
    })
})
