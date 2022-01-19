pragma solidity ^0.7.5;

import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IWETH.sol";
import "./interfaces/ITreasury.sol";
import "./interfaces/IStake.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract Fetch is Ownable {

  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  address public WETH;

  address public dexRouter;

  address public token;

  address public STABLE_COIN;

  address public treasury;

  uint256 public percentToDex = 40;

  uint256 public percentToTreasury = 40;

  uint256 public percentToPlatform = 20;

  address public platformAddress;

  address public stake;

  /**
  * @dev constructor
  *
  * @param _WETH                  address of Wrapped Ethereum token
  * @param _dexRouter             address of Corader DEX
  * @param _token                 address of token token
  */
  constructor(
    address _WETH,
    address _dexRouter,
    address _token,
    address _STABLE_COIN,
    address _treasury,
    address _platformAddress,
    address _stake
    )
    public
  {
    WETH = _WETH;
    dexRouter = _dexRouter;
    token = _token;
    STABLE_COIN = _STABLE_COIN;
    treasury = _treasury;
    platformAddress = _platformAddress;
    stake = _stake;
  }

  function convert() external payable {
    _convertFor(msg.sender);
  }

  function convertFor(address receiver) external payable {
    _convertFor(receiver);
  }

  /**
  * @dev spit ETH input with DEX and Treasury
  */
  function _convertFor(address receiver) internal {
    require(msg.value > 0, "zerro eth");
    // swap ETH
    swapETHInput(msg.value);
    // stake for user
    uint256 tokenReceived = IERC20(token).balanceOf(address(this));
    require(tokenReceived > 0, "not swapped");
    IERC20(token).approve(stake, tokenReceived);
    IStake(stake).stake(receiver, tokenReceived, true, true);
  }


 /**
 * @dev swap ETH to token via DEX and Treasury
 */
 function swapETHInput(uint256 input) internal {
  (uint256 ethToDex,
   uint256 ethToTreasury,
   uint256 ethToPlatform) = calculateToSplit(input);

  if(ethToDex > 0)
    swapETHViaDEX(dexRouter, token, ethToDex);

  if(ethToTreasury > 0)
    swapETHViaTreasury(ethToTreasury);

  if(ethToPlatform > 0)
    payable(platformAddress).transfer(ethToPlatform);
 }

 // helper for swap ETH to token
 function swapETHViaDEX(address routerDEX, address toToken, uint256 amount) internal {
   // SWAP split % of ETH input to token
   address[] memory path = new address[](2);
   path[0] = WETH;
   path[1] = toToken;

   IUniswapV2Router02(routerDEX).swapExactETHForTokens{value:amount}(
     1,
     path,
     address(this),
     block.timestamp + 1800
   );
 }

 // helper for get OHM from treasury via deposit
 function swapETHViaTreasury(uint256 amount) internal {
    swapETHViaDEX(dexRouter, STABLE_COIN, amount);

    uint256 stableCoinAmount = IERC20(STABLE_COIN).balanceOf(address(this));
    IERC20(STABLE_COIN).approve(address(treasury), stableCoinAmount);
    ITreasury(treasury).deposit( stableCoinAmount, STABLE_COIN, 0);

    uint256 tokenAmount = IERC20(token).balanceOf(address(this));
    require(tokenAmount > 0, "Zerro token from treasury");
 }

 /**
 * @dev return eth amount for dex, treasury and platform
 */
 function calculateToSplitETH(uint256 ethInput)
   private
   view
   returns (
     uint256 ethToDex,
     uint256 ethToTreasury,
     uint256 ethToPlatform
   )
 {
   ethToDex = ethInput.div(100).mul(percentToDex);
   ethToTreasury = ethInput.div(100).mul(percentToTreasury);
   ethToPlatform = ethInput.div(100).mul(percentToPlatform);
 }

 /**
 * @dev return split % amount of input
 */
 function calculateToSplit(uint256 ethInput)
   public
   view
   returns(uint256 ethToDex, uint256 ethToTreasury, uint256 ethToPlatform)
 {
   (ethToDex,
    ethToTreasury,
    ethToPlatform) = calculateToSplitETH(ethInput);
 }

 /**
 * @dev allow owner update split %
 */
 function updateSplitPercent(
   uint256 _percentToDex,
   uint256 _percentToTreasury,
   uint256 _percentToPlatform
 )
   external
   onlyOwner
 {
   uint256 total = _percentToDex + _percentToTreasury + _percentToPlatform;
   require(total == 100, "Wrong total");

   percentToDex = _percentToDex;
   percentToTreasury = _percentToTreasury;
   percentToPlatform = _percentToPlatform;
 }

 /**
 * @dev allow owner update platform address
 */
 function updatePlatformAddress(address _platformAddress)
   external
   onlyOwner
 {
   platformAddress = _platformAddress;
 }
}
