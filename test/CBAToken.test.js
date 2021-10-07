const {constants,expectRevert,expectEvent,time,ether,BN} = require('@openzeppelin/test-helpers');
const {expect} = require('chai');
const Reverter = require('./utils/reverter');
const CBAToken = artifacts.require("CBAToken");
contract('CBAToken test', ([defaultAddress,wallet, user1,user2,user3]) => {
    const reverter = new Reverter(web3);
    let totalSupply = new BN("3000000000000000000000000000");
    before('setup', async () => {
        cbaToken = await CBAToken.new(wallet,defaultAddress)
        await reverter.snapshot();
    })
    afterEach('revert', reverter.revert);
    describe('Check for correct deployment', async () => {
        it("Check properties of token", async () => {
            expect(await cbaToken.name()).to.be.equal("Crypto Perx")
            expect(await cbaToken.decimals()).to.be.bignumber.equal("18")
            expect(await cbaToken.totalSupply()).to.be.bignumber.equal(totalSupply)
        })
        it("Check balance on addresses", async () => {
            expect(await cbaToken.balanceOf(wallet)).to.be.bignumber.equal(totalSupply)
        })
        it("Check owner of token", async () => {
            expect(await cbaToken.owner()).to.be.equal(defaultAddress)
        })
    })
    describe('Functions', async () => {
        describe('constructor', async () => {
            it("Must fail if try to set owner with zero addresss", async () => {
                await expectRevert(CBAToken.new(wallet,constants.ZERO_ADDRESS),"CPRX: incorrect owner address")
            })
            it("Must fail if try mint token to zero address", async () => {
                await expectRevert(CBAToken.new(constants.ZERO_ADDRESS,defaultAddress),"CPRX: incorrect wallet address")
            })
        })
        describe('transfer', async () => {
            it("Must fail if try to transfer to zero address", async () => {
                await expectRevert(cbaToken.transfer(constants.ZERO_ADDRESS,1000,{from:wallet}),"ERC20: transfer to the zero address")
            })
            it("Must fail if try to transfer more than sender has", async () => {
                await expectRevert(cbaToken.transfer(user1,totalSupply + 1,{from:wallet}),"ERC20: transfer amount exceeds balance")
            })
            it("Must transfer correctly", async () => {
                expect(await cbaToken.balanceOf(wallet)).to.be.bignumber.equal(totalSupply)
                await cbaToken.transfer(user1,1000,{from:wallet})
                expect(await cbaToken.balanceOf(wallet)).to.be.bignumber.equal("2999999999999999999999999000")
                expect(await cbaToken.balanceOf(user1)).to.be.bignumber.equal("1000")
                await cbaToken.transfer(user2,500,{from:user1})
                expect(await cbaToken.balanceOf(user1)).to.be.bignumber.equal("500")
                expect(await cbaToken.balanceOf(user2)).to.be.bignumber.equal("500")
            })
        })
        describe('approve and transferFrom', async () => {
            it("Must fail if sender isn't approved", async () => {
                await expectRevert(cbaToken.transferFrom(wallet,user1,1000,{from:wallet}),"ERC20: transfer amount exceeds allowance");
                await expectRevert(cbaToken.transferFrom(wallet,user1,1000,{from:user1}),"ERC20: transfer amount exceeds allowance");
            })
            it("Must fail if sender exceeds allowance", async () => {
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal("0");
                await cbaToken.approve(user1,1000,{from:wallet})
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal("1000");
                await expectRevert(cbaToken.transferFrom(wallet,user1,1001,{from:user1}),"ERC20: transfer amount exceeds allowance");
            })
            it("Must tranferFrom correctly", async () => {
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal("0");
                let approveEventRes = await cbaToken.approve(user1,1000,{from:wallet})
                expectEvent(approveEventRes,"Approval",{owner:wallet,spender:user1,value:"1000"})
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal("1000");
                expect(await cbaToken.balanceOf(user1)).to.be.bignumber.equal("0")
                let transferEventRes = await cbaToken.transferFrom(wallet,user1,1000,{from:user1})
                expect(await cbaToken.balanceOf(user1)).to.be.bignumber.equal("1000")
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal("0");
                expectEvent(transferEventRes,"Transfer",{from:wallet,to:user1,value:"1000"})
            })
        })
        //increaseAllowance and decreaseAllowance
        describe('increaseAllowance and decreaseAllowance', async () => {
            it("Must fail if increase allowance more than max value of uint256 (overflow)", async () => {
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal("0");
                await cbaToken.approve(user1,1000,{from:wallet})
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal("1000");
                await expectRevert(cbaToken.increaseAllowance(user1,constants.MAX_UINT256,{from:wallet}),"revert")
            })
            it("Must fail if decrease allowance more than was approved (underflow)", async () => {
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal("0");
                await cbaToken.approve(user1,1000,{from:wallet})
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal("1000");
                await expectRevert(cbaToken.decreaseAllowance(user1,2000,{from:wallet}),"ERC20: decreased allowance below zero")
            })  
            it("Must increase allowance correctly", async () => {
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal("0");
                await cbaToken.approve(user1,1000,{from:wallet})
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal("1000");
                await cbaToken.increaseAllowance(user1,1000,{from:wallet})
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal("2000");
            }) 
            it("Must decrease allowance correctly", async () => {
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal("0");
                await cbaToken.approve(user1,1000,{from:wallet})
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal("1000");
                await cbaToken.decreaseAllowance(user1,500,{from:wallet})
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal("500");
            })
        })
        //burn
        describe('burn', async () => {
            it("Must fail if burn tokens more than user has", async () => {
                await expectRevert(cbaToken.burn(1,{from:user1}),"ERC20: burn amount exceeds balance")
                await expectRevert(cbaToken.burn(totalSupply+1,{from:wallet}),"ERC20: burn amount exceeds balance")
            })
            it("Must burn tokens correctly", async () => {
                expect(await cbaToken.balanceOf(wallet)).to.be.bignumber.equal(totalSupply)
                let transferEventRes = await cbaToken.burn(1000,{from:wallet})
                expect(await cbaToken.balanceOf(wallet)).to.be.bignumber.equal("2999999999999999999999999000")
                expectEvent(transferEventRes,"Transfer",{from:wallet,to:constants.ZERO_ADDRESS,value:"1000"})
            })
        })
        //burnFrom
        describe('burnFrom', async () => {
            it("Must fail if sender try to burn more tokens than allowed", async () => {
                await expectRevert(cbaToken.burnFrom(wallet,1000,{from:user1}),"ERC20: burn amount exceeds allowance")
            })
            it("Must fail if sender try to burn tokens from zero address", async () => {
                await expectRevert(cbaToken.burnFrom(constants.ZERO_ADDRESS,0,{from:user1}),"ERC20: approve from the zero address")
            })
            it("Must fail if sender try to burn tokens from zero address", async () => {
                await expectRevert(cbaToken.burnFrom(constants.ZERO_ADDRESS,1000,{from:user1}),"ERC20: burn amount exceeds allowance")
            })
            it("Must fail if sender try to burn more tokens than the address has", async () => {
                let burnTokenAmount = totalSupply + 1000;
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal("0");
                await cbaToken.approve(user1,burnTokenAmount,{from:wallet})
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal(burnTokenAmount.toString());
                await expectRevert(cbaToken.burnFrom(wallet,burnTokenAmount,{from:user1}),"ERC20: burn amount exceeds balance")
            })
            it("Must burnFrom correctly", async () => {
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal("0");
                await cbaToken.approve(user1,1000,{from:wallet})
                expect(await cbaToken.allowance(wallet,user1)).to.be.bignumber.equal("1000");
                expect(await cbaToken.balanceOf(wallet)).to.be.bignumber.equal(totalSupply)
                await cbaToken.burnFrom(wallet,1000,{from:user1})
                expect(await cbaToken.balanceOf(wallet)).to.be.bignumber.equal("2999999999999999999999999000")
            })
        })
    })
})
