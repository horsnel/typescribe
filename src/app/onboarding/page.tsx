'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Film, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { genres } from '@/lib/data';

const STEPS = ['genres', 'ratings', 'notifications', 'done'] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, updateProfile } = useAuth();
  const [step, setStep] = useState<Step>('genres');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(7);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    router.replace('/login');
    return null;
  }

  const toggleGenre = (name: string) => {
    setSelectedGenres((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  const stepIndex = STEPS.indexOf(step);

  const handleNext = () => {
    if (step === 'genres') {
      updateProfile({ favorite_genres: selectedGenres });
      setStep('ratings');
    } else if (step === 'ratings') {
      updateProfile({ min_rating: minRating });
      setStep('notifications');
    } else if (step === 'notifications') {
      updateProfile({ email_notifications: emailNotifications, public_profile: publicProfile });
      setStep('done');
    }
  };

  const handleSkip = () => {
    if (step === 'genres') setStep('ratings');
    else if (step === 'ratings') setStep('notifications');
    else if (step === 'notifications') setStep('done');
  };

  const handleFinish = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Film className="w-7 h-7 text-[#d4a853]" strokeWidth={1.5} />
            <span className="text-xl font-extrabold text-white">Typescribe</span>
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= stepIndex ? 'bg-[#d4a853]' : 'bg-[#2a2a35]'
                }`}
              />
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
          {step === 'genres' && (
            <>
              <h2 className="text-xl font-bold text-white mb-2">Pick your favorite genres</h2>
              <p className="text-sm text-[#6b7280] mb-6">We&apos;ll use these to personalize your recommendations</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {genres.map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.name)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                      selectedGenres.includes(genre.name)
                        ? 'border-[#d4a853] bg-[#d4a853]/10 text-white'
                        : 'border-[#1e1e28] bg-[#050507] text-[#9ca3af] hover:border-[#3a3a45]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                        selectedGenres.includes(genre.name)
                          ? 'bg-[#d4a853] border-[#d4a853]'
                          : 'border-[#3a3a45]'
                      }`}
                    >
                      {selectedGenres.includes(genre.name) && <Check className="w-3 h-3 text-white" strokeWidth={1.5} />}
                    </div>
                    <span className="text-sm font-medium">{genre.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'ratings' && (
            <>
              <h2 className="text-xl font-bold text-white mb-2">Set your rating threshold</h2>
              <p className="text-sm text-[#6b7280] mb-6">We&apos;ll highlight movies rated above this score</p>
              <div className="text-center mb-8">
                <div className="text-5xl font-extrabold text-[#d4a853] mb-2">{minRating.toFixed(1)}</div>
                <p className="text-sm text-[#6b7280]">Minimum rating</p>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
                className="w-full accent-[#d4a853] mb-2"
              />
              <div className="flex justify-between text-xs text-[#6b7280]">
                <span>1.0</span>
                <span>5.0</span>
                <span>10.0</span>
              </div>
            </>
          )}

          {step === 'notifications' && (
            <>
              <h2 className="text-xl font-bold text-white mb-2">Notification preferences</h2>
              <p className="text-sm text-[#6b7280] mb-6">Choose how you want to hear from us</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#050507] border border-[#1e1e28] rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">Email Notifications</p>
                    <p className="text-xs text-[#6b7280] mt-0.5">Get updates about new movies and reviews</p>
                  </div>
                  <button
                    onClick={() => setEmailNotifications(!emailNotifications)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      emailNotifications ? 'bg-[#d4a853]' : 'bg-[#2a2a35]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                        emailNotifications ? 'translate-x-5.5' : 'translate-x-0.5'
                      }`}
                      style={{ left: emailNotifications ? '22px' : '2px' }}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-[#050507] border border-[#1e1e28] rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">Public Profile</p>
                    <p className="text-xs text-[#6b7280] mt-0.5">Let others see your reviews and watchlist</p>
                  </div>
                  <button
                    onClick={() => setPublicProfile(!publicProfile)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      publicProfile ? 'bg-[#d4a853]' : 'bg-[#2a2a35]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform`}
                      style={{ left: publicProfile ? '22px' : '2px' }}
                    />
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 'done' && (
            <>
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-[#d4a853]/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-[#d4a853]" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">You&apos;re all set!</h2>
                <p className="text-sm text-[#6b7280]">
                  Welcome to Typescribe, {user.display_name}. Start exploring movies tailored to your taste.
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#1e1e28]">
            {step !== 'done' ? (
              <>
                <button onClick={handleSkip} className="text-sm text-[#6b7280] hover:text-white transition-colors">
                  Skip
                </button>
                <Button onClick={handleNext} className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2">
                  Continue <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                </Button>
              </>
            ) : (
              <div className="w-full">
                <Button onClick={handleFinish} className="w-full bg-[#d4a853] hover:bg-[#b8922e] text-white">
                  Start Exploring
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
