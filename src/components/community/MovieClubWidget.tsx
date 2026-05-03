'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Film, Calendar, Users, Clock, Plus, Check, X,
  ChevronRight, Video, MessageSquare, UserPlus, UserMinus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getMovieClubs,
  createMovieClub,
  joinMovieClub,
  leaveMovieClub,
  type MovieClub,
} from '@/lib/community-storage';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/community-storage';

interface MovieClubWidgetProps {
  communityId: string;
  communityName: string;
  isMember: boolean;
}

export default function MovieClubWidget({ communityId, communityName, isMember }: MovieClubWidgetProps) {
  const { user, isAuthenticated } = useAuth();
  const [clubs, setClubs] = useState<MovieClub[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMovie, setNewMovie] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('20:00');
  const [newPrompt, setNewPrompt] = useState('');

  useEffect(() => {
    setClubs(getMovieClubs(communityId));
  }, [communityId]);

  const handleCreate = () => {
    if (!user || !newMovie.trim() || !newDate) return;
    
    const club = createMovieClub({
      communityId,
      name: newName.trim() || `${newMovie} Watch Party`,
      description: `Community watch party for ${newMovie}`,
      movieTitle: newMovie.trim(),
      movieSlug: newMovie.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      posterPath: '',
      scheduledDate: new Date(`${newDate}T${newTime}:00Z`).toISOString(),
      scheduledTime: `${newTime} UTC`,
      hostId: user.id,
      hostName: user.display_name || 'Anonymous',
      hostAvatar: user.avatar || '',
      maxAttendees: 50,
      status: 'upcoming',
      discussionPrompt: newPrompt.trim() || `What did you think of ${newMovie}?`,
    });
    
    setClubs(prev => [...prev, club]);
    setNewName('');
    setNewMovie('');
    setNewDate('');
    setNewTime('20:00');
    setNewPrompt('');
    setShowCreate(false);
  };

  const handleJoin = (clubId: string) => {
    if (!user) return;
    const updated = joinMovieClub(clubId, user.id, user.display_name || 'Anonymous', user.avatar || '');
    if (updated) setClubs(prev => prev.map(c => c.id === clubId ? updated : c));
  };

  const handleLeave = (clubId: string) => {
    if (!user) return;
    const updated = leaveMovieClub(clubId, user.id);
    if (updated) setClubs(prev => prev.map(c => c.id === clubId ? updated : c));
  };

  const getStatusColor = (status: MovieClub['status']) => {
    if (status === 'upcoming') return 'text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/20';
    if (status === 'watching') return 'text-green-400 bg-green-500/10 border-green-500/20';
    return 'text-[#6b7280] bg-[#1e1e28] border-[#1e1e28]';
  };

  const upcomingClubs = clubs.filter(c => c.status === 'upcoming');
  const pastClubs = clubs.filter(c => c.status === 'completed');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center">
            <Video className="w-5 h-5 text-[#8B5CF6]" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Movie Clubs</h3>
            <p className="text-xs text-[#6b7280]">Watch together, discuss together</p>
          </div>
        </div>
        {isAuthenticated && isMember && (
          <Button
            onClick={() => setShowCreate(!showCreate)}
            size="sm"
            className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-2 min-h-[44px]"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} /> Schedule
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-[#0c0c10] border border-[#8B5CF6]/30 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-white">Schedule a Movie Club</h4>
            <button onClick={() => setShowCreate(false)} className="text-[#6b7280] hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center">
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
          <input
            type="text"
            value={newMovie}
            onChange={(e) => setNewMovie(e.target.value)}
            placeholder="Movie title"
            className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#8B5CF6] text-sm min-h-[44px]"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Event name (optional — defaults to movie name)"
            className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#8B5CF6] text-sm min-h-[44px]"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="bg-[#050507] border border-[#1e1e28] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#8B5CF6] text-sm min-h-[44px]"
            />
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="bg-[#050507] border border-[#1e1e28] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#8B5CF6] text-sm min-h-[44px]"
            />
          </div>
          <textarea
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            placeholder="Discussion prompt after the movie (optional)"
            rows={2}
            className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#8B5CF6] text-sm resize-none"
          />
          <Button
            onClick={handleCreate}
            disabled={!newMovie.trim() || !newDate}
            className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-2 min-h-[44px]"
            size="sm"
          >
            <Calendar className="w-4 h-4" strokeWidth={1.5} /> Schedule Watch Party
          </Button>
        </div>
      )}

      {/* Upcoming clubs */}
      {upcomingClubs.length > 0 ? (
        <div className="space-y-3">
          {upcomingClubs.map((club) => {
            const isAttending = user ? club.attendees.some(a => a.userId === user.id) : false;
            const isFull = club.attendees.length >= club.maxAttendees;
            const scheduledDate = new Date(club.scheduledDate);
            const isToday = new Date().toDateString() === scheduledDate.toDateString();

            return (
              <div key={club.id} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5 hover:border-[#8B5CF6]/20 transition-all group">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center flex-shrink-0">
                    <Film className="w-5 h-5 text-[#8B5CF6]" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-white group-hover:text-[#8B5CF6] transition-colors">
                        {club.name}
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(club.status)}`}>
                        {isToday ? 'Tonight' : club.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#9ca3af] mb-1">{club.movieTitle}</p>
                    <div className="flex items-center gap-3 text-[10px] text-[#6b7280]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" strokeWidth={1.5} /> {scheduledDate.toLocaleDateString()} {club.scheduledTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" strokeWidth={1.5} /> {club.attendees.length}/{club.maxAttendees}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" strokeWidth={1.5} /> Hosted by {club.hostName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Attendee avatars */}
                {club.attendees.length > 0 && (
                  <div className="flex items-center gap-1 mb-3">
                    {club.attendees.slice(0, 8).map((attendee, i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center text-white text-[8px] font-bold overflow-hidden border-2 border-[#0c0c10]" style={{ marginLeft: i > 0 ? '-4px' : '0', zIndex: club.attendees.length - i }}>
                        {attendee.avatar ? (
                          <img src={attendee.avatar} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : attendee.userName[0]?.toUpperCase() || '?'}
                      </div>
                    ))}
                    {club.attendees.length > 8 && (
                      <span className="text-[10px] text-[#6b7280] ml-2">+{club.attendees.length - 8} more</span>
                    )}
                  </div>
                )}

                {/* Discussion prompt */}
                {club.discussionPrompt && (
                  <div className="bg-[#050507] border border-[#1e1e28] rounded-lg p-3 mb-3">
                    <p className="text-xs text-[#9ca3af]">
                      <MessageSquare className="w-3 h-3 inline mr-1 text-purple-400" strokeWidth={1.5} />
                      {club.discussionPrompt}
                    </p>
                  </div>
                )}

                {/* Action */}
                {isAuthenticated && isMember && (
                  isAttending ? (
                    <Button
                      onClick={() => handleLeave(club.id)}
                      variant="outline"
                      size="sm"
                      className="border-[#8B5CF6]/30 text-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white gap-2 min-h-[36px] w-full"
                    >
                      <UserMinus className="w-3.5 h-3.5" strokeWidth={1.5} /> Leave Watch Party
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleJoin(club.id)}
                      size="sm"
                      disabled={isFull}
                      className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-2 min-h-[36px] w-full"
                    >
                      <UserPlus className="w-3.5 h-3.5" strokeWidth={1.5} /> {isFull ? 'Full' : 'Join Watch Party'}
                    </Button>
                  )
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 bg-[#0c0c10] border border-[#1e1e28] rounded-xl">
          <Video className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
          <h4 className="text-sm font-semibold text-white mb-1">No Movie Clubs Yet</h4>
          <p className="text-xs text-[#6b7280]">Schedule a watch party and invite the community to watch together!</p>
        </div>
      )}

      {/* Past clubs */}
      {pastClubs.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-2">Past Watch Parties</h4>
          <div className="space-y-2">
            {pastClubs.slice(0, 3).map((club) => (
              <div key={club.id} className="flex items-center gap-3 p-3 bg-[#0c0c10] border border-[#1e1e28] rounded-lg opacity-60">
                <Film className="w-4 h-4 text-[#6b7280]" strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#9ca3af] truncate">{club.movieTitle}</p>
                  <p className="text-[10px] text-[#6b7280]">{new Date(club.scheduledDate).toLocaleDateString()} · {club.attendees.length} attended</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
