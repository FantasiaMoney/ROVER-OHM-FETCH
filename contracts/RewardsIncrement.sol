// step 1 convert ETH to DAI
// step 2 put DAI to treasury and get OHM
// step 3 put OHM to stake rewards

pragma solidity ^0.6.0;

import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/ITreasury.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RewardsIncrement {
  IUniswapV2Router02 public router;
  ITreasury public treasury;
  address public weth;
  address public dai;
  address public ohm;
  address public stake;

  constructor(
    address _router,
    address _weth,
    address _dai,
    address _treasury,
    address _stake
  )
  public
  {
    router = IUniswapV2Router02(_router);
    weth = _weth;
    dai = _dai;
    treasury = ITreasury(_treasury);
    stake = _stake;
  }

  function convertToDaiMintOhmIncreaseRewards() external payable {
    require(msg.value > 0, "Zerro ETH");

    address[] memory path = new address[](2);
    path[0] = weth;
    path[1] = dai;

    router.swapExactETHForTokens.value(msg.value)(1, path, address(this), now + 15 minutes);

    uint256 daiAmount = IERC20(dai).balanceOf(address(this));

    require(daiAmount > 0, "Zerro DAI");
    IERC20(dai).approve(address(treasury), daiAmount);
    treasury.deposit( daiAmount, dai, 0);

    uint256 ohmAmount = IERC20(ohm).balanceOf(address(this));
    require(ohmAmount > 0, "Zerro OHM");
    IERC20(ohm).transfer(stake, ohmAmount);
  }
}
