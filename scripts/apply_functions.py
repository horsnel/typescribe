#!/usr/bin/env python3
"""Apply Postgres functions for vibe search (match_movies) + taste twin (compute_taste_twins)."""
import psycopg2

DB_URL = "postgresql://postgres.iancvwkvqapkstqdltfs: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@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

STATEMENTS = [
    # match_movies: cosine similarity search for F1 Vibe Search
    """
    create or replace function public.match_movies(query_embedding vector(768), match_count int default 20)
    returns table (
      movie_id int,
      movie_title text,
      poster_path text,
      overview text,
      genres text[],
      similarity float
    )
    language sql stable security definer set search_path = public as $$
      select
        movie_id,
        movie_title,
        poster_path,
        overview,
        genres,
        1 - (embedding <=> query_embedding) as similarity
      from public.movie_embeddings
      order by embedding <=> query_embedding
      limit match_count;
    $$;
    """,

    # compute_taste_twins: Pearson correlation between two users based on co-rated movies
    """
    create or replace function public.compute_taste_twins(p_user_id uuid, p_limit int default 5)
    returns table (
      twin_user_id uuid,
      similarity float,
      shared_count int
    )
    language plpgsql security definer set search_path = public as $$
    declare
      other_user uuid;
      avg_a float;
      avg_b float;
      cov float;
      var_a float;
      var_b float;
      n int;
      sim float;
    begin
      -- Pre-compute caller's average rating
      select avg(rating) into avg_a
      from public.reviews
      where user_id = p_user_id;

      for other_user in
        select distinct r2.user_id
        from public.reviews r1
        join public.reviews r2 on r1.movie_id = r2.movie_id
        where r1.user_id = p_user_id
          and r2.user_id <> p_user_id
      loop
        select
          avg(r2.rating) into avg_b
        from public.reviews r2
        where r2.user_id = other_user
          and r2.movie_id in (select movie_id from public.reviews where user_id = p_user_id);

        select
          count(*),
          coalesce(sum((r1.rating - avg_a) * (r2.rating - avg_b)), 0),
          coalesce(sum((r1.rating - avg_a) ^ 2), 0),
          coalesce(sum((r2.rating - avg_b) ^ 2), 0)
        into n, cov, var_a, var_b
        from public.reviews r1
        join public.reviews r2 on r1.movie_id = r2.movie_id
        where r1.user_id = p_user_id
          and r2.user_id = other_user;

        if n >= 3 and var_a > 0 and var_b > 0 then
          sim := cov / (sqrt(var_a) * sqrt(var_b));
          if sim > 0.3 then
            insert into public.taste_twins (user_id, twin_user_id, similarity, shared_count, computed_at)
            values (p_user_id, other_user, sim, n, now())
            on conflict (user_id, twin_user_id) do update
              set similarity = excluded.similarity,
                  shared_count = excluded.shared_count,
                  computed_at = now();
          end if;
        end if;
      end loop;

      return query
        select twin_user_id, similarity::float, shared_count
        from public.taste_twins
        where user_id = p_user_id
        order by similarity desc
        limit p_limit;
    end;
    $$;
    """,

    # Grant access
    "grant execute on function public.match_movies(vector, int) to anon, authenticated;",
    "grant execute on function public.compute_taste_twins(uuid, int) to anon, authenticated;",
]

def main():
    print(f"Connecting…")
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()
    for s in STATEMENTS:
        try:
            cur.execute(s)
            print("✅", s.strip().split('\n')[1].strip()[:80])
        except Exception as e:
            print("⚠️", str(e)[:120])
    # Verify
    cur.execute("select proname from pg_proc where proname in ('match_movies','compute_taste_twins')")
    print("\nFunctions:", [r[0] for r in cur.fetchall()])
    cur.close(); conn.close()

if __name__ == "__main__":
    main()
