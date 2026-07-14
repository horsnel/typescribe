import Link from 'next/link';
import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Watch Parties — Typescribe',
  description: 'Browse and join upcoming sync-watch parties, or schedule your own.',
};

export const dynamic = 'force-dynamic';

interface PartyRow {
  id: string;
  movie_title: string;
  scheduled_for: string;
  host_profile_id: string;
  attendee_count?: number;
}

async function getUpcomingParties(): Promise<PartyRow[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('watch_parties')
      .select('id, movie_title, scheduled_for, host_profile_id, attendee_count')
      .gte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(20);
    if (error) return [];
    return (data ?? []) as PartyRow[];
  } catch {
    return [];
  }
}

export default async function WatchPartiesPage() {
  const parties = await getUpcomingParties();

  return (
    <main className="min-h-screen bg-[#08080c] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#D4A853] mb-3">Social</p>
            <h1 className="text-4xl font-bold tracking-tight">Watch Parties</h1>
            <p className="text-[#9ca3af] mt-3 max-w-2xl">
              Sync-watch with friends in real time. Share playback position, chat, and leave
              scene-timeline comments as the film unfolds.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center rounded-full bg-[#D4A853] px-5 py-2.5 text-sm font-medium text-black hover:bg-[#B8922F]"
          >
            Host a party
          </Link>
        </header>

        <section>
          <h2 className="text-sm uppercase tracking-wider text-[#9ca3af] mb-4">Upcoming</h2>
          {parties.length === 0 ? (
            <div className="rounded-2xl border border-[#1e1e28] bg-[#0c0c10] p-12 text-center">
              <p className="text-[#9ca3af]">No upcoming parties scheduled.</p>
              <Link
                href="/dashboard"
                className="mt-4 inline-flex items-center rounded-full bg-[#D4A853] px-5 py-2.5 text-sm font-medium text-black hover:bg-[#B8922F]"
              >
                Host the first one
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parties.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/watch-parties/${p.id}`}
                    className="block rounded-2xl border border-[#1e1e28] bg-[#0c0c10] p-5 hover:border-[#D4A853]/40 transition-colors"
                  >
                    <div className="text-xs text-[#9ca3af] mb-1">
                      {new Date(p.scheduled_for).toLocaleString()}
                    </div>
                    <div className="text-lg font-semibold">{p.movie_title}</div>
                    {typeof p.attendee_count === 'number' && (
                      <div className="text-xs text-[#9ca3af] mt-2">
                        {p.attendee_count} attending
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
