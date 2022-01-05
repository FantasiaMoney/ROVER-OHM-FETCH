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

// real contracts
const UniswapV2Factory = artifacts.require('./UniswapV2Factory.sol')
const UniswapV2Router = artifacts.require('./UniswapV2Router02.sol')
const UniswapV2Pair = artifacts.require('./UniswapV2Pair.sol')
const WETH = artifacts.require('./WETH9.sol')
const TOKEN = artifacts.require('./OlympusERC20Token.sol')
const STOKEN = artifacts.require('./sOlympus.sol')
const Fetch = artifacts.require('./Fetch.sol')
const Sale = artifacts.require('./Sale.sol')
const SplitFormula = artifacts.require('./SplitFormula')
const RewardsIncrement = artifacts.require('./RewardsIncrement')
const DAI = artifacts.require('./DAI')
const Treasury = artifacts.require('./OlympusTreasury')
const Stake = artifacts.require('./OlympusStaking')

const MINLDAmountInDAI = toWei("450")
const MAXLDAmountInDAI = toWei("1000")
const DAITotal = toWei(String(1000 * 10))
const DAIRate = toWei(String(1000))

const BlocksNeededForQueue = 0
const initialIndex = '7675210820'


let pancakeFactory,
    pancakeRouter,
    weth,
    token,
    pair,
    pancakePairAddress,
    fetch,
    sale,
    splitFormula,
    splitFormulaSecond,
    rewardsIncrement,
    dai,
    treasury,
    stake,
    tokenDaiPair,
    sToken


contract('Fetch-with-LD-test', function([userOne, userTwo, userThree]) {

  async function deployContracts(){
    // deploy contracts
    weth = await WETH.new()
    dai = await DAI.new(DAITotal)


    sToken = await STOKEN.new()

    pancakeFactory = await UniswapV2Factory.new(userOne)
    pancakeRouter = await UniswapV2Router.new(pancakeFactory.address, weth.address)

    token = await TOKEN.new()

    // GET TOKEN FROM DEPOSIT

    await pancakeFactory.createPair(token.address, dai.address)
    tokenDaiPair = await pancakeFactory.allPairs(0)

    treasury = await Treasury.new(
      token.address,
      dai.address,
      tokenDaiPair,
      BlocksNeededForQueue
    )

    // Set treasury for OHM token
    await token.setVault(treasury.address)

    stake = await Stake.new(
      token.address,
      sToken.address,
      '2200',
      '338',
      '8961000'
    )

    // set stake for stoken
    await sToken.initialize(stake.address)
    await sToken.setIndex(initialIndex)

    await treasury.queue('0', userOne)
    await treasury.toggle('0', userOne, '0x0000000000000000000000000000000000000000')

    await dai.approve(treasury.address, DAITotal)
    await treasury.deposit(DAIRate, dai.address, DAIRate)

    // const halfOfTotalSupply = BigNumber(BigNumber(BigNumber(await token.totalSupply()).dividedBy(2)).integerValue()).toString(10)
    // const quarterOfTotalSupply = halfOfTotalSupply / 2

    // // add token liquidity
    // await token.approve(pancakeRouter.address, quarterOfTotalSupply)
    // await pancakeRouter.addLiquidityETH(
    //   token.address,
    //   quarterOfTotalSupply,
    //   1,
    //   1,
    //   userOne,
    //   "1111111111111111111111"
    // , { from:userOne, value:toWei(String(500)) })
    //
    // pancakePairAddress = await pancakeFactory.allPairs(1)
    // pair = await UniswapV2Pair.at(pancakePairAddress)
    //
    // // ADD DAI to LD
    // await dai.approve(pancakeRouter.address, DAIRate)
    // await pancakeRouter.addLiquidityETH(
    //   dai.address,
    //   DAIRate,
    //   1,
    //   1,
    //   userOne,
    //   "1111111111111111111111"
    // , { from:userOne, value:toWei(String(1)) })
    //
    //
    // const initialRate = await pancakeRouter.getAmountsOut(
    //   1000000000,
    //   [token.address, weth.address]
    // )
    //
    // splitFormula = await SplitFormula.new(
    //   initialRate[1],
    //   MINLDAmountInDAI,
    //   MAXLDAmountInDAI,
    //   pancakeRouter.address,
    //   pair.address,
    //   token.address,
    //   dai.address
    // )
    //
    // splitFormulaSecond = await SplitFormula.new(
    //   initialRate[1],
    //   MINLDAmountInDAI,
    //   MAXLDAmountInDAI,
    //   pancakeRouter.address,
    //   pair.address,
    //   token.address,
    //   dai.address
    // )
    //

    // rewardsIncrement = await RewardsIncrement.new(
    //   pancakeRouter.address,
    //   weth.address,
    //   dai.address,
    //   treasury.address,
    //   stake.address,
    //   token.address
    // )
    //
    // sale = await Sale.new(
    //   token.address,
    //   userOne,
    //   pancakeRouter.address,
    //   rewardsIncrement.address
    // )
    //
    // fetch = await Fetch.new(
    //   weth.address,
    //   pancakeRouter.address,
    //   token.address,
    //   sale.address,
    //   splitFormula.address
    // )
    //
    // // send all remains to sale and ld maanger
    // const saleAmount = await token.balanceOf(userOne)
    //
    // // sell
    // await token.transfer(sale.address, saleAmount)
    //

    //
    // // update white list for fetch
    // await sale.updateWhiteList(fetch.address, true)

    // TODO
    // // set distributor contract and warmup contract
    // await staking.setContract('0', distributor.address);
    // await staking.setContract('1', stakingWarmup.address);
  }

  beforeEach(async function() {
    await deployContracts()
  })


describe('INIT', function() {

    it('PairHash correct', async function() {
      assert.equal(
        String(await pancakeFactory.pairCodeHash()).toLowerCase(),
        String(PairHash).toLowerCase(),
      )
    })

    it('Factory in Router correct', async function() {
      assert.equal(
        String(await pancakeRouter.factory()).toLowerCase(),
        String(pancakeFactory.address).toLowerCase(),
      )
    })

    it('WETH in Router correct', async function() {
      assert.equal(
        String(await pancakeRouter.WETH()).toLowerCase(),
        String(weth.address).toLowerCase(),
      )
    })
})

// describe('Split formula', function() {
//     it('Not owner can not update split formula', async function() {
//       await fetch.updateSplitFormula(
//         splitFormulaSecond.address,
//         { from:userTwo }
//       ).should.be.rejectedWith(EVMRevert)
//     })
//
//     it('Owner canupdate split formula', async function() {
//       assert.equal(await fetch.splitFormula(), splitFormula.address)
//
//       await fetch.updateSplitFormula(
//         splitFormulaSecond.address
//       )
//
//       assert.equal(await fetch.splitFormula(), splitFormulaSecond.address)
//     })
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
