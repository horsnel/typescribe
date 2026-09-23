import MovieDetailSkeleton from '@/components/skeletons/MovieDetailSkeleton';

// Instant skeleton shown by the App Router while the movie detail page
// chunk loads — makes navigation between movie pages feel seamless.
export default function Loading() {
  return <MovieDetailSkeleton />;
}
