-- Backfill coingecko_id for the standard token universe so the swap quote
-- price resolver has a working CoinGecko fallback when Binance is unreachable
-- or returns an unsupported pair (e.g. USDTUSDT). Only fills rows where the
-- column is currently null/empty — admin overrides are preserved.

update tokens
set coingecko_id = case symbol
  when 'BTC'   then 'bitcoin'
  when 'ETH'   then 'ethereum'
  when 'BNB'   then 'binancecoin'
  when 'SOL'   then 'solana'
  when 'XRP'   then 'ripple'
  when 'ADA'   then 'cardano'
  when 'DOGE'  then 'dogecoin'
  when 'AVAX'  then 'avalanche-2'
  when 'LINK'  then 'chainlink'
  when 'TON'   then 'the-open-network'
  when 'USDT'  then 'tether'
  when 'USDC'  then 'usd-coin'
  when 'TRX'   then 'tron'
  when 'DOT'   then 'polkadot'
  when 'MATIC' then 'matic-network'
  when 'POL'   then 'polygon-ecosystem-token'
  when 'LTC'   then 'litecoin'
  when 'BCH'   then 'bitcoin-cash'
  else coingecko_id
end
where coingecko_id is null or coingecko_id = '';
