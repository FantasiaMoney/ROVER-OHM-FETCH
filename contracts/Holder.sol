import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Holder is ERC20, Ownable {
   IERC20 public underlyingToken;

   constructor(address _underlyingToken)
   ERC20("HOLD", "HOLD")
   public
   {
     underlyingToken = IERC20(_underlyingToken);
   }

   function deposit(uint _amount) external {
     underlyingToken.transferFrom(msg.sender, address(this), _amount);
     _mint(msg.sender, _amount);
   }

   function withdraw(uint _amount) external {
     IERC20(address(this)).transferFrom(msg.sender, address(this), _amount);
     _burn(address(this), _amount);

     uint256 amountToSend = withdrawRate(_amount);
     underlyingToken.transfer(msg.sender, amountToSend);
   }

   function withdrawRate(uint _amount) public view returns(uint) {

   }

   function burnRemains() onlyOwner public {
     
   }
}
