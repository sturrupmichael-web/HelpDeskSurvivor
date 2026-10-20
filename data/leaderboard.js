// Online leaderboard (Supabase). The publishable key is meant to be public: the `scores`
// table only lets anyone read rows and add new ones (row level security, see README).
export const LEADERBOARD = {
  url: 'https://abeqdmurddrkrqbnfylb.supabase.co',
  key: 'sb_publishable_8WUpbX-clRvdKgset72mkQ_C_NFL5E8',
  table: 'scores',
  top: 10, // rows shown per map
  timeout: 8000, // ms before a request counts as failed
  nameMax: 16,
};
