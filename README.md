# Run tests
```
1) npm run ganache
2) truffle test
```

# if Router-Hash-test failed
```
Make sure You updated PairHash in config.js and test/contracts/dex/libraries/UniswapV2Library.sol
```

# Description
```
Step 1

User send BNB, we put some to DEX some to Sale.

Step 2

BNB from sale we convert to DAI (again via DEX) and put to Tresuary

Step 3

Tresuary mint new OHM and we put this into stake rewards

Step 4

Stake increase sOHM (rebase) for users because we increased total supply of OHM



Tresuary

function deposit( uint _amount, address _token, uint _profit ) external returns ( uint send_ )


Safemoon token

1) We have SF based based token, we only add ExcludedFromTransferLimit for manage stake limit and allow stake transfer to user more than max limit.

For case if user gained more than max limit transfer in stake duration.

```
