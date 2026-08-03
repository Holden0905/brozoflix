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

export interface Rating {
  id: string;
  jellyfin_id: string;
  rated_by: string;
  stars: number;
  created_at: string;
}

export type DiscFormat = 'dvd' | 'bluray' | 'uhd';

/**
 * A disc on the shelf. Keyed on tmdb_id rather than jellyfin_id on purpose:
 * discs outlive re-encodes, and you can own one you haven't ripped yet — so a
 * row here may have no counterpart in `titles`.
 */
export interface PhysicalMedia {
  id: string;
  media_type: MediaType;
  tmdb_id: number;
  /** NOT NULL in the table — a shelf row must be able to render on its own. */
  title: string;
  year: number | null;
  poster_path: string | null;
  format: DiscFormat;
  note: string | null;
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
