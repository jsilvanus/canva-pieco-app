export interface SlideSnippets {
  headline: string;
  time_and_venue: string;
  short_body: string;
  contact_line?: string;
  full_slide_block: string;
}

export interface EventItem {
  id: string;
  series_id?: string;
  title: string;
  start_time: string;
  end_time?: string;
  date_display: string;
  time_display: string;
  venue: string;
  venue_address?: string;
  category: string;
  categories?: string[];
  link_url?: string;
  description_clean?: string;
  slide_snippets?: SlideSnippets;
}

export function getKatrinaBaseUrl(): string;

export function fetchEvents(params?: {
  startDate?: string;
  endDate?: string;
  category?: string;
  venue?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<{ total: number; items: EventItem[] }>;

export function fetchEvent(id: string): Promise<EventItem>;

export function fetchCategories(): Promise<{ categories: string[]; main_groups: any[] }>;

export function fetchVenues(): Promise<{ venues: { id: string; name: string; address?: string }[] }>;
