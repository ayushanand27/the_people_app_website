-- Fix chat/follow: RLS was calling users_are_blocked without EXECUTE for authenticated.
-- Inline EXISTS keeps block checks without exposing the helper via RPC.

DROP POLICY IF EXISTS p_messages_insert ON messages;
CREATE POLICY p_messages_insert ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocker_id = sender_id AND blocked_id = receiver_id)
         OR (blocker_id = receiver_id AND blocked_id = sender_id)
    )
  );

DROP POLICY IF EXISTS p_follows_insert ON follows;
CREATE POLICY p_follows_insert ON follows
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = follower_id
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocker_id = follower_id AND blocked_id = following_id)
         OR (blocker_id = following_id AND blocked_id = follower_id)
    )
  );
