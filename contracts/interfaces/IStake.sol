interface IStake {
  function stake(
      address _to,
      uint256 _amount,
      bool _rebasing,
      bool _claim
  ) external returns (uint256);
}
