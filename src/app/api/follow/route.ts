import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, followUser, unfollowUser, getFollowers, getFollowing, isFollowing, getFollowingCount, getFollowerCount } from '@/lib/db';

export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const target = url.searchParams.get('user_id');
  if (!target) {
    const [followers, following, followerCount, followingCount] = await Promise.all([
      getFollowers(profile.id),
      getFollowing(profile.id),
      getFollowerCount(profile.id),
      getFollowingCount(profile.id),
    ]);
    return NextResponse.json({ followers, following, followerCount, followingCount });
  }
  const following = await isFollowing(profile.id, target);
  return NextResponse.json({ isFollowing: following });
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { action, targetUserId } = await req.json();
  if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 });

  if (action === 'unfollow') {
    await unfollowUser(profile.id, targetUserId);
    return NextResponse.json({ following: false });
  }
  const ok = await followUser(profile.id, targetUserId);
  return NextResponse.json({ following: ok });
}
