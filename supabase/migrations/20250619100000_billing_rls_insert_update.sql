-- reset_billing_period_if_needed inserts/updates as the authenticated user (security invoker).
create policy "Users can insert own billing account"
  on public.billing_accounts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own billing account"
  on public.billing_accounts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
