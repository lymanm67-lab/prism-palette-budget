-- Sync Lyman's IU plan holdings to Jul-24-2026 statement
UPDATE public.investment_holdings SET quantity=1956.770, price=64.64, market_value=126485.61, cost_basis=65.57, updated_at=now() WHERE id='acab3aee-a124-4723-ad59-2f2a83467b16';
UPDATE public.investment_holdings SET quantity=123.768, price=53.68, market_value=6643.87, cost_basis=43.43, updated_at=now() WHERE id='8d6300e1-2543-41db-a304-5ede7d4aa6c3';
UPDATE public.investment_holdings SET quantity=175.137, price=64.64, market_value=11320.86, cost_basis=63.94, updated_at=now() WHERE id='fe7ac59a-d005-49b4-90d3-13363891d06d';

UPDATE public.accounts SET balance=133129.48, last_synced_at=now() WHERE id='3e7c9fa8-53cc-4ed5-90bf-cb15c0477f4c';
UPDATE public.accounts SET balance=11320.86, last_synced_at=now() WHERE id='7dbe823a-089a-4129-b080-6a7e5877b47a';

-- IU TDA PLAN (51913) account + holdings
INSERT INTO public.accounts (id, household_id, name, institution, account_type, balance, currency, is_active, last_synced_at)
VALUES ('4a1f0e2c-9b31-4d77-9a52-1c0f7b8e5a10','22b0f75a-82f2-4b56-85b9-1db72b95da1b','IU TDA PLAN','Fidelity','investment',16888.01,'USD',true,now())
ON CONFLICT (id) DO UPDATE SET balance=EXCLUDED.balance, last_synced_at=now();

INSERT INTO public.investment_holdings (account_id, household_id, symbol, name, quantity, price, market_value, cost_basis, currency)
VALUES
 ('4a1f0e2c-9b31-4d77-9a52-1c0f7b8e5a10','22b0f75a-82f2-4b56-85b9-1db72b95da1b','VFORX','VANG TARGET RET 2040',15.588,53.68,836.76,43.58,'USD'),
 ('4a1f0e2c-9b31-4d77-9a52-1c0f7b8e5a10','22b0f75a-82f2-4b56-85b9-1db72b95da1b','VTHRX','VANG TARGET RET 2030',18.719,44.80,838.61,36.24,'USD'),
 ('4a1f0e2c-9b31-4d77-9a52-1c0f7b8e5a10','22b0f75a-82f2-4b56-85b9-1db72b95da1b','VFIFX','VANG TARGET RET 2050',235.344,64.64,15212.64,64.39,'USD');