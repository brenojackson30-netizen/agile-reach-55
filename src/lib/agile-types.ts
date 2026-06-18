export type Role = "admin" | "editor" | "viewer";
export type Status = "pending" | "active" | "inactive";
export type Platform = "instagram" | "youtube" | "tiktok" | "facebook" | "threads" | "kwai";
export type PostType = "post" | "reels" | "shorts" | "video" | "carrossel" | "story" | "live";

export interface Client {
  id: string;
  name: string;
  avatar_initials: string | null;
  color_hex: string | null;
  status: Status;
  category: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  client_link: string | null;
  posts_per_day: number;
  videos_per_day: number;
  created_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  created_at: string;
}

export interface SocialProfile {
  id: string;
  project_id: string;
  platform: Platform;
  handle: string;
  url: string | null;
  created_at: string;
}

export interface ScheduledPost {
  id: string;
  profile_id: string;
  post_time: string;
  post_type: PostType;
  label: string | null;
  days: number[];
  created_at: string;
}

export interface PostCompletion {
  id: string;
  post_id: string | null;
  scheduled_post_id: string | null;
  completed_date: string;
  completed_by: string | null;
  completed_at: string;
}

export interface Employee {
  id: string;
  user_id: string;
  name: string;
  avatar_initials: string | null;
  role: Role;
  status: Status;
  created_at: string;
}

export interface ClientAssignment {
  id: string;
  employee_id: string;
  client_id: string;
  assigned_by: string | null;
  assigned_at: string;
}
