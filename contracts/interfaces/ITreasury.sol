interface ITreasury {
  function deposit( uint _amount, address _token, uint _profit ) external returns ( uint send_ );
}
