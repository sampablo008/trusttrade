-- promo_slots: landing page content blocks, editable by admin without redeploy

CREATE TABLE IF NOT EXISTS promo_slots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,           -- hero | badge_1 | badge_2 | badge_3 | feature_1..6
  slot_type   text NOT NULL DEFAULT 'text',   -- text | image | rich
  title       text,
  subtitle    text,
  body        text,
  image_path  text,
  cta_label   text,
  cta_href    text,
  is_enabled  boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id)
);

ALTER TABLE promo_slots ENABLE ROW LEVEL SECURITY;

-- Public: read enabled slots
CREATE POLICY "promo_slots_public_read" ON promo_slots
  FOR SELECT USING (is_enabled = true);

-- Admin: full access
CREATE POLICY "promo_slots_admin_all" ON promo_slots
  FOR ALL USING (is_admin());

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION touch_promo_slot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER promo_slots_touch
  BEFORE UPDATE ON promo_slots
  FOR EACH ROW EXECUTE FUNCTION touch_promo_slot();

-- Default seed
INSERT INTO promo_slots (slug, slot_type, title, subtitle, body, cta_label, cta_href, sort_order) VALUES
  ('hero', 'rich', 'Trade crypto. Win big.', 'Binary signals, live charts, instant payouts.', NULL, 'Start trading', '/signup', 0),
  ('badge_security', 'text', 'Bank-grade security', NULL, 'Your funds and data are protected by military-grade encryption and multi-layer authentication.', NULL, NULL, 10),
  ('badge_payouts', 'text', 'Fast payouts', NULL, 'Withdraw your winnings within 24 hours directly to your crypto wallet.', NULL, NULL, 11),
  ('badge_support', 'text', '24/7 support', NULL, 'Our support team is always on hand to help you with any questions or issues.', NULL, NULL, 12),
  ('feature_charts', 'text', 'Live charts', NULL, 'Professional TradingView-grade candle charts with 1s to 1d timeframes, updated in real time.', NULL, NULL, 20),
  ('feature_referrals', 'text', '5-level referrals', NULL, 'Earn commissions on every deposit made by your recruits — up to 5 levels deep.', NULL, NULL, 21),
  ('feature_profits', 'text', 'Up to 85% profit', NULL, 'Win up to 85% of your stake on every correctly predicted trade.', NULL, NULL, 22),
  ('feature_tokens', 'text', 'Multiple assets', NULL, 'Trade BTC, ETH, USDT, BNB, and more — all on one platform.', NULL, NULL, 23),
  ('feature_wallet', 'text', 'Crypto wallet', NULL, 'Deposit and withdraw with USDT-TRC20, ERC20, BEP20, and BTC.', NULL, NULL, 24),
  ('feature_mobile', 'text', 'Mobile ready', NULL, 'Trade from anywhere — TrustPro is fully responsive and PWA-installable.', NULL, NULL, 25)
ON CONFLICT (slug) DO NOTHING;
