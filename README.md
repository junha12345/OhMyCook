<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/12zqGj9dj9XG3lXlqkLMuLHahr2IgjCLn

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Add API keys to [.env.local](.env.local):
   ```bash
   GEMINI_API_KEY=your_gemini_key
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_public_anon_key
   ```
3. Run the app:
   `npm run dev`

## Supabase setup

Create the following tables in Supabase (SQL editor or `supabase schema diff`):

```sql
-- Basic user profile that mirrors Supabase Auth user id
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id),
  email text not null unique,
  display_name text,
  has_completed_onboarding boolean default false,
  preferred_cuisines text[] default '{}',
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Individual search log (for analytics/observability)
create table if not exists public.search_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  recipe_name text not null,
  search_term text not null,
  created_at timestamptz default now()
);
create index if not exists search_events_recipe_idx on public.search_events (recipe_name);

-- Aggregated search counters for popular recipes
create table if not exists public.recipe_search_counts (
  recipe_name text primary key,
  search_count integer not null default 0
);

-- Ingredients a user currently has
create table if not exists public.user_ingredients (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id),
  ingredient_name text not null,
  quantity text not null,
  created_at timestamptz default now()
);
create index if not exists user_ingredients_user_idx on public.user_ingredients (user_id);

-- Recipes a user saved/bookmarked
create table if not exists public.user_saved_recipes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id),
  recipe_name text not null,
  recipe_data jsonb not null,
  created_at timestamptz default now()
);
create index if not exists user_saved_recipes_user_idx on public.user_saved_recipes (user_id);
```

Then enable Row Level Security and add policies:

```sql
alter table public.user_profiles enable row level security;
alter table public.search_events enable row level security;
alter table public.recipe_search_counts enable row level security;
alter table public.user_ingredients enable row level security;
alter table public.user_saved_recipes enable row level security;

-- Allow users to manage only their own profile and ingredients
create policy "users manage their profile" on public.user_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "users manage their ingredients" on public.user_ingredients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage their saved recipes" on public.user_saved_recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Allow anonymous reads of popular recipes only
create policy "read recipe counts" on public.recipe_search_counts
  for select using (true);

-- Allow inserting search events (optionally anonymous)
create policy "log search events" on public.search_events
  for insert using (true) with check (true);
```

With the tables in place, use the helper functions in `services/supabaseService.ts`:

- `saveUserProfile(profile)` to upsert signup/onboarding data.
- `recordRecipeSearch({ userId, recipeName, searchTerm })` to log a query and bump its popularity count.
- `getPopularRecipes(limit)` to fetch the most searched recipes.
- `replaceUserIngredients(userId, ingredients)` or `appendUserIngredient` to store pantry items per user.
- `replaceUserSavedRecipes(userId, recipes)` and `getUserSavedRecipes(userId)` to persist user bookmarks.
