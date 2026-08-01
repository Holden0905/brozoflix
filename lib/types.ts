export type MediaType = 'movie' | 'show';

export interface Title {
  jellyfin_id: string;
  media_type: MediaType;
  tmdb_id: number;
  imdb_id: string | null;
  title: string;
  year: number | null;
  runtime_min: number | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: string[] | null;
  episode_count: number | null;
  seasons: number[] | null;
  date_added: string | null;
  synced_at: string | null;
}

export type RequestStatus = 'requested' | 'added' | 'declined';

export interface TitleRequest {
  id: string;
  media_type: MediaType;
  tmdb_id: number;
  title: string | null;
  year: number | null;
  poster_path: string | null;
  requested_by: string;
  note: string | null;
  status: RequestStatus;
  created_at: string;
}

export interface SearchResult {
  media_type: MediaType;
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  overview: string | null;
  owned: boolean;
  jellyfin_id: string | null;
}
