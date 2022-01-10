import { BN, fromWei, toWei } from 'web3-utils'
import ether from './helpers/ether'
import EVMRevert from './helpers/EVMRevert'
import { duration } from './helpers/duration'
import { PairHash } from '../config'
import BigNumber from 'bignumber.js'

const timeMachine = require('ganache-time-traveler')

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BN))
  .should()

const ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

// real contracts
const UniswapV2Factory = artifacts.require('./UniswapV2Factory.sol')
const UniswapV2Router = artifacts.require('./UniswapV2Router02.sol')
const UniswapV2Pair = artifacts.require('./UniswapV2Pair.sol')
const Authority = artifacts.require('./OlympusAuthority')
const WETH = artifacts.require('./WETH9.sol')
const DAI = artifacts.require('./DAI')
const Migrator = artifacts.require('./OlympusTokenMigrator')
const Treasury = artifacts.require('./OlympusTreasury')
const TOKEN = artifacts.require('./OlympusERC20Token.sol')
const STOKEN = artifacts.require('./sOlympus.sol')
const GTOKEN = artifacts.require('./gOHM.sol')
const Stake = artifacts.require('./OlympusStaking')
const Distributor = artifacts.require('./Distributor')
const Fetch = artifacts.require('./Fetch.sol')
const SplitFormula = artifacts.require('./SplitFormula')
const SplitFormulaMock = artifacts.require('./CustomSplitFormula')
const Bond = artifacts.require('./OlympusBondDepository')
const BondTeller = artifacts.require('./BondTeller')
const BondingCalculator = artifacts.require('./OlympusBondingCalculator')

const MINLDAmountInDAI = toWei("450")
const MAXLDAmountInDAI = toWei("1000")
const DAITotal = toWei(String(100000000000 * 10))
const DAIRate = toWei(String(100000000000))

const BlocksNeededForQueue = 0
const initialIndex = '7675210820'
const firstEpochNumber = "550"
const firstBlockNumber = "9505000"
const initialMint = "10000000000000000000000000"

const oldOHM = "0xC0b491daBf3709Ee5Eb79E603D73289Ca6060932"
const oldsOHM = "0x1Fecda1dE7b6951B248C0B62CaeBD5BAbedc2084"
const oldStaking = "0xC5d3318C0d74a72cD7C55bdf844e24516796BaB2"
const oldwsOHM = "0xe73384f11Bb748Aa0Bc20f7b02958DF573e6E2ad"
const sushiRouter = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
const uniRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
const oldTreasury = "0x0d722D813601E48b7DAcb2DF9bae282cFd98c6E7"


let pancakeFactory,
    pancakeRouter,
    weth,
    token,
    pair,
    pancakePairAddress,
    fetch,
    splitFormula,
    dai,
    treasury,
    stake,
    tokenDaiPair,
    sToken,
    distributor,
    bondCalculator,
    authority,
    gToken,
    migrator,
    bond,
    teller


contract('Fetch-with-LD-test', function([userOne, userTwo, userThree]) {

  async function deployContracts(){
    // DEPLOY DEX
    weth = await WETH.new()
    pancakeFactory = await UniswapV2Factory.new(userOne)
    pancakeRouter = await UniswapV2Router.new(pancakeFactory.address, weth.address)

    // DEPLOY TOKENS
    dai = await DAI.new(0)
    await dai.mint(userOne, initialMint)

    // DEPLOY OHM platform
    authority = await Authority.new(
      userOne,
      userOne,
      userOne,
      userOne
    )

    migrator = await Migrator.new(
        oldOHM,
        oldsOHM,
        oldTreasury,
        oldStaking,
        oldwsOHM,
        sushiRouter,
        uniRouter,
        "0",
        authority.address
    )

    token = await TOKEN.new(authority.address)
    sToken = await STOKEN.new()
    gToken = await GTOKEN.new(migrator.address, sToken.address)

    await migrator.setgOHM(gToken.address)

    treasury = await Treasury.new(token.address, "0", authority.address)

    // allow deposit from deployer address
    await treasury.enable("0", userOne, ZERO_ADDRESS)

    await authority.pushVault(treasury.address, true)

    stake = await Stake.new(
        token.address,
        sToken.address,
        gToken.address,
        "2200",
        firstEpochNumber,
        firstBlockNumber,
        authority.address
    )

    distributor = await Distributor.new(
        treasury.address,
        token.address,
        stake.address,
        authority.address
    )

    await sToken.setIndex("7675210820")
    await sToken.setgOHM(gToken.address)
    await sToken.initialize(stake.address, treasury.address)

    await stake.setDistributor(distributor.address)

    // ADD DAI to LD
    await dai.approve(pancakeRouter.address, toWei("100"))
    await pancakeRouter.addLiquidityETH(
      dai.address,
      toWei("100"),
      1,
      1,
      userOne,
      "1111111111111111111111"
    , { from:userOne, value:toWei(String(1)) })


    splitFormula = await SplitFormulaMock.new()

    fetch = await Fetch.new(
      weth.address,
      pancakeRouter.address,
      token.address,
      splitFormula.address,
      dai.address,
      treasury.address
    )

    bondCalculator = await BondingCalculator.new(token.address)
    bond = await Bond.new(token.address, treasury.address, authority.address)
    teller = new BondTeller(bond.address, stake.address, treasury.address, token.address, sToken.address, authority.address)
    await bond.setTeller(teller.address)

    // allow bond deposit
    await treasury.enable("3", teller.address, bondCalculator.address)
    await treasury.enable("2", dai.address, bondCalculator.address)
    await treasury.enable("0", bond.address, bondCalculator.address)

    // allow deposit from fetch
    await treasury.enable("0", fetch.address, ZERO_ADDRESS)

    await treasury.initialize()

    await treasury.queueTimelock("0", migrator.address, migrator.address)
    await treasury.queueTimelock("8", migrator.address, migrator.address)
    await treasury.queueTimelock("2", dai.address, dai.address)

    await treasury.execute("0")
    await treasury.execute("1")
    await treasury.execute("2")

    // ADD LD
    // get some OHM from treasury for create OHM/BNB and OHM/DAI pools
    await dai.approve(treasury.address, toWei("200"))
    await treasury.deposit(
      toWei("200"),
      dai.address,
      0
    )

    // add OHM/BNB
    await token.approve(pancakeRouter.address, "100000000000")
    await pancakeRouter.addLiquidityETH(
      token.address,
      "100000000000",
      1,
      1,
      userOne,
      "1111111111111111111111"
    , { from:userOne, value:toWei(String(10)) })


    // add OHM/DAI
    await token.approve(pancakeRouter.address, "100000000000")
    await dai.approve(pancakeRouter.address, toWei("1"))
    await pancakeRouter.addLiquidity(
      token.address,
      dai.address,
      "100000000000",
      toWei("1"),
      1,
      1,
      userOne,
      "1111111111111111111111"
     )

    // get pairs
    pancakePairAddress = await pancakeFactory.allPairs(1)
    pair = await UniswapV2Pair.at(pancakePairAddress)
    tokenDaiPair = await pancakeFactory.allPairs(2)

    // // invalid opcode
    // // await treasury.execute("3")
    // // await treasury.execute("4")
  }

  beforeEach(async function() {
    await deployContracts()
  })


// describe('INIT', function() {
//
//     it('PairHash correct', async function() {
//       assert.equal(
//         String(await pancakeFactory.pairCodeHash()).toLowerCase(),
//         String(PairHash).toLowerCase(),
//       )
//     })
//
//     it('Factory in Router correct', async function() {
//       assert.equal(
//         String(await pancakeRouter.factory()).toLowerCase(),
//         String(pancakeFactory.address).toLowerCase(),
//       )
//     })
//
//     it('WETH in Router correct', async function() {
//       assert.equal(
//         String(await pancakeRouter.WETH()).toLowerCase(),
//         String(weth.address).toLowerCase(),
//       )
//     })
// })

describe('BOND', function() {
  it('Can be deposited', async function() {
    await bond.addBond(tokenDaiPair, bondCalculator.address, toWei("10"), false)

    await bond.setTerms(
       0, //bondId,
       2, // terms.controlVariable,
       false, // terms.fixedTerm,
       5, // terms.vestingTerm,
       6, // terms.expiration,
       2222222, // terms.conclusion,
       10, // terms.minimumPrice,
       1, // terms.maxPayout,
       10, // terms.maxDebt,
       0 // initialDebt
    )

    // console.log(Number(await bond.bondPrice(0)))
    // console.log(await bond.bondPriceInUSD(0))
    // console.log(await bond.debtRatio(0))
    console.log(await bondCalculator.markdown(tokenDaiPair))
    await bond.deposit(toWei("0.01"), 200, userOne, 0, userOne)
  })
})

// describe('STAKE', function() {
//   it('Can be staked', async function() {
//     console.log("Shares before", Number(await sToken.balanceOf(userOne)))
//     await dai.approve(treasury.address, toWei("1"))
//     await treasury.deposit(toWei("1"), dai.address, 0)
//     await token.approve(stake.address, Number(await token.balanceOf(userOne)))
//     await stake.stake(userOne, Number(await token.balanceOf(userOne)), false, false)
//     console.log("Shares after", Number(await sToken.balanceOf(userOne)))
//   })
// })
//
// describe('CONVERT', function() {
//   it('User receive token after convert', async function() {
//     assert.equal(await token.balanceOf(userTwo), 0)
//     // convert
//     await fetch.convert({ from:userTwo, value:toWei(String(10)) })
//     assert.notEqual(await token.balanceOf(userTwo), 0)
//   })
//
//   it('LD increase after convert', async function() {
//     // convert
//     console.log("Total LD before convert ", Number(fromWei(await weth.balanceOf(pair.address))))
//     await fetch.convert({ from:userTwo, value:toWei(String(10)) })
//
//     const initialRate = await pancakeRouter.getAmountsOut(
//       1000000000,
//       [token.address, weth.address]
//     )
//
//     console.log("Rate for 1 TOKEN with add LD", Number(initialRate[1]), "ETH wei")
//     console.log("Total LD after ", Number(fromWei(await weth.balanceOf(pair.address))))
//    })
// })
  //END
})
