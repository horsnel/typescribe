/**
 * GET /api/communities            — list communities (real Supabase data)
 * GET /api/communities?id=<slug>  — single community + its posts
 * POST /api/communities           — create a new community
 *
 * Previously this route returned MOCK_COMMUNITIES + MOCK_POSTS hardcoded
 * arrays. Those have been removed; all data now comes from the `communities`
 * and `posts` tables in Supabase.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const communityId = searchParams.get('id');

    if (communityId) {
      // ── Single community + posts ──
      const { data: community, error: cErr } = await supabaseAdmin
        .from('communities')
        .select('*')
        .or(`slug.eq.${communityId},id.eq.${communityId}`)
        .maybeSingle();

      if (cErr) throw cErr;
      if (!community) {
        return NextResponse.json({ error: 'Community not found' }, { status: 404 });
      }

      const { data: posts, error: pErr } = await supabaseAdmin
        .from('posts')
        .select('id, user_id, title, body, likes_count, comments_count, created_at, moderation_status')
        .eq('community_id', community.id)
        .neq('moderation_status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(50);

      if (pErr) throw pErr;

      // Hydrate post authors
      const userIds = [...new Set((posts ?? []).map((p: any) => p.user_id).filter(Boolean))];
      let authorMap = new Map<string, { name: string; avatar: string | null }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds);
        for (const p of profiles ?? []) {
          authorMap.set(p.id, { name: p.display_name ?? 'Anonymous', avatar: p.avatar_url ?? null });
        }
      }

      const shapedPosts = (posts ?? []).map((p: any) => {
        const author = authorMap.get(p.user_id) ?? { name: 'Anonymous', avatar: null };
        return {
          id: p.id,
          title: p.title ?? '',
          author: author.name,
          authorId: p.user_id,
          authorAvatar: author.avatar,
          content: p.body ?? '',
          replyCount: p.comments_count ?? 0,
          upvoteCount: p.likes_count ?? 0,
          createdAt: p.created_at,
        };
      });

      return NextResponse.json({
        community: {
          id: community.slug ?? community.id,
          name: community.name,
          description: community.description ?? '',
          type: community.category ?? 'Theme',
          members: community.member_count ?? 0,
          posts: community.post_count ?? 0,
          rules: [], // rules are not currently stored in the schema
          createdAt: community.created_at,
          creatorId: community.created_by,
          creatorName: 'Community',
          bannerUrl: community.banner_url,
          iconUrl: community.icon_url,
        },
        posts: shapedPosts,
      });
    }

    // ── List communities ──
    const { data: communities, error } = await supabaseAdmin
      .from('communities')
      .select('id, slug, name, description, category, member_count, post_count, created_at, created_by, banner_url, icon_url')
      .order('member_count', { ascending: false, nullsFirst: false })
      .limit(100);

    if (error) throw error;

    const shaped = (communities ?? []).map((c: any) => ({
      id: c.slug ?? c.id,
      name: c.name,
      description: c.description ?? '',
      type: c.category ?? 'Theme',
      members: c.member_count ?? 0,
      posts: c.post_count ?? 0,
      rules: [],
      createdAt: c.created_at,
      creatorId: c.created_by,
      creatorName: 'Community',
      bannerUrl: c.banner_url,
      iconUrl: c.icon_url,
    }));

    return NextResponse.json({ communities: shaped });
  } catch (error: any) {
    console.error('[API /communities] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch communities', details: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, type, creatorId, creatorName } = body;

    if (!name || !description) {
      return NextResponse.json({ error: 'Name and description are required' }, { status: 400 });
    }

    const slug = slugify(name);

    const { data, error } = await supabaseAdmin
      .from('communities')
      .insert({
        slug,
        name,
        description,
        category: type || 'Theme',
        member_count: 1,
        post_count: 0,
        created_by: creatorId || null,
      })
      .select()
      .single();

    if (error) {
      // Slug collision — return existing
      if (error.code === '23505') {
        const { data: existing } = await supabaseAdmin
          .from('communities')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();
        if (existing) {
          return NextResponse.json({ community: existing, existing: true });
        }
      }
      throw error;
    }

    return NextResponse.json({
      community: {
        id: data.slug,
        name: data.name,
        description: data.description,
        type: data.category,
        members: data.member_count,
        posts: data.post_count,
        rules: [],
        createdAt: data.created_at,
        creatorId: data.created_by,
        creatorName: creatorName || 'Anonymous',
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API /communities] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to create community', details: error.message },
      { status: 500 },
    );
  }
}
