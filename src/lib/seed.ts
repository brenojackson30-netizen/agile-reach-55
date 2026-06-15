import { supabase } from "@/integrations/supabase/client";
import type { Platform, PostType } from "./agile-types";

interface SeedPost {
  time: string;
  type: PostType;
  label: string;
  days?: number[];
}
interface SeedProfile {
  platform: Platform;
  handle: string;
  url: string;
  posts: SeedPost[];
}
interface SeedProject {
  name: string;
  profiles: SeedProfile[];
}
interface SeedClient {
  name: string;
  color_hex: string;
  category: string;
  avatar_initials: string;
  projects: SeedProject[];
}

const ALL = [0, 1, 2, 3, 4, 5, 6];

const SEED: SeedClient[] = [
  {
    name: "Prof. Mateus Oliver",
    color_hex: "#6366F1",
    category: "Educação",
    avatar_initials: "MO",
    projects: [
      {
        name: "Instituto Oliver",
        profiles: [
          {
            platform: "instagram",
            handle: "@institutooliver_oficial",
            url: "https://www.instagram.com/institutooliver_oficial/",
            posts: [{ time: "20:45", type: "post", label: "Post diário" }],
          },
          {
            platform: "youtube",
            handle: "@institutooliver",
            url: "https://www.youtube.com/@institutooliver",
            posts: [{ time: "20:45", type: "video", label: "Vídeo diário" }],
          },
        ],
      },
      {
        name: "Caveira Cast",
        profiles: [
          {
            platform: "instagram",
            handle: "@caveiracastoficial",
            url: "https://www.instagram.com/caveiracastoficial/",
            posts: [
              { time: "14:45", type: "post", label: "Post" },
              { time: "17:45", type: "post", label: "Post" },
              { time: "20:45", type: "post", label: "Post" },
            ],
          },
          {
            platform: "tiktok",
            handle: "@caveiracastoficial",
            url: "https://www.tiktok.com/@caveiracastoficial",
            posts: [
              { time: "11:45", type: "post", label: "Post" },
              { time: "17:45", type: "post", label: "Post" },
            ],
          },
          {
            platform: "youtube",
            handle: "@ocaveiracast",
            url: "https://www.youtube.com/@ocaveiracast",
            posts: [
              { time: "11:45", type: "video", label: "Corte longo" },
              { time: "15:00", type: "shorts", label: "Short" },
              { time: "18:30", type: "video", label: "Corte longo" },
              { time: "20:45", type: "shorts", label: "Short" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Sargento Castro",
    color_hex: "#EF4444",
    category: "Militar / Entretenimento",
    avatar_initials: "SC",
    projects: [
      {
        name: "Sargento Castro",
        profiles: [
          {
            platform: "instagram",
            handle: "@sargentocastrooficial",
            url: "https://www.instagram.com/sargentocastrooficial/",
            posts: [
              { time: "11:45", type: "post", label: "Post" },
              { time: "14:45", type: "post", label: "Post" },
              { time: "17:45", type: "post", label: "Post" },
              { time: "20:45", type: "post", label: "Post" },
            ],
          },
          {
            platform: "youtube",
            handle: "@osargentocastro",
            url: "https://www.youtube.com/@osargentocastro",
            posts: [{ time: "18:30", type: "video", label: "Motovlog", days: [1, 3, 5] }],
          },
          {
            platform: "tiktok",
            handle: "@sargentocastrooficial",
            url: "https://www.tiktok.com/@sargentocastrooficial",
            posts: [{ time: "11:45", type: "post", label: "Post diário" }],
          },
        ],
      },
      {
        name: "PodCastro",
        profiles: [
          {
            platform: "instagram",
            handle: "@podcastrooficial",
            url: "https://www.instagram.com/podcastrooficial/",
            posts: [
              { time: "14:45", type: "post", label: "Corte" },
              { time: "17:45", type: "post", label: "Corte" },
              { time: "20:45", type: "post", label: "Corte" },
            ],
          },
          {
            platform: "tiktok",
            handle: "@podcastrooficial",
            url: "https://www.tiktok.com/@podcastrooficial",
            posts: [
              { time: "14:45", type: "post", label: "Corte" },
              { time: "17:45", type: "post", label: "Corte" },
              { time: "20:45", type: "post", label: "Corte" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Dr. Juan Lambert",
    color_hex: "#10B981",
    category: "Saúde",
    avatar_initials: "JL",
    projects: [
      {
        name: "Dr. Juan Lambert",
        profiles: [
          {
            platform: "instagram",
            handle: "@drjuanlambert",
            url: "https://www.instagram.com/drjuanlambert/",
            posts: [
              { time: "14:45", type: "reels", label: "Reels" },
              { time: "17:45", type: "carrossel", label: "Carrossel" },
              { time: "20:20", type: "post", label: "Post" },
            ],
          },
          {
            platform: "tiktok",
            handle: "@drjuanlambertoficial",
            url: "https://www.tiktok.com/@drjuanlambertoficial",
            posts: [{ time: "20:20", type: "post", label: "Post" }],
          },
          {
            platform: "threads",
            handle: "@drjuanlambert",
            url: "https://www.threads.com/@drjuanlambert",
            posts: [{ time: "20:20", type: "post", label: "Post" }],
          },
          {
            platform: "kwai",
            handle: "@dr.juanlambert",
            url: "https://k.kwai.com/u/@dr.juanlambert/sLBoxTCf",
            posts: [{ time: "20:20", type: "post", label: "Post" }],
          },
          {
            platform: "facebook",
            handle: "Drjuanlambert",
            url: "https://www.facebook.com/Drjuanlambert",
            posts: [{ time: "20:20", type: "post", label: "Post" }],
          },
          {
            platform: "youtube",
            handle: "@drjuanlambert",
            url: "https://www.youtube.com/@drjuanlambert",
            posts: [{ time: "20:20", type: "video", label: "Vídeo" }],
          },
        ],
      },
    ],
  },
  {
    name: "Sargento Giroto",
    color_hex: "#F59E0B",
    category: "Militar",
    avatar_initials: "SG",
    projects: [
      {
        name: "Sargento Giroto",
        profiles: [
          {
            platform: "instagram",
            handle: "@rogeriogiroto",
            url: "https://www.instagram.com/rogeriogiroto/",
            posts: [
              { time: "11:45", type: "post", label: "Post" },
              { time: "14:45", type: "post", label: "Post" },
              { time: "17:45", type: "post", label: "Post" },
              { time: "20:45", type: "post", label: "Post" },
            ],
          },
          {
            platform: "youtube",
            handle: "@SargentoGiroto",
            url: "https://www.youtube.com/@SargentoGiroto",
            posts: [
              { time: "11:45", type: "shorts", label: "Short" },
              { time: "18:30", type: "video", label: "Corte longo" },
              { time: "18:30", type: "shorts", label: "Short" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Lourdes",
    color_hex: "#EC4899",
    category: "Imobiliária",
    avatar_initials: "LO",
    projects: [
      {
        name: "Imobiliária J A Lima",
        profiles: [
          {
            platform: "instagram",
            handle: "@imobiliariajalima",
            url: "https://www.instagram.com/imobiliariajalima/",
            posts: [{ time: "14:45", type: "post", label: "Post diário" }],
          },
        ],
      },
    ],
  },
  {
    name: "Ten. Barbieratto",
    color_hex: "#8B5CF6",
    category: "Militar / Entretenimento",
    avatar_initials: "TB",
    projects: [
      {
        name: "Tenente Barbieratto",
        profiles: [
          {
            platform: "instagram",
            handle: "@tenente.barbieratto",
            url: "https://www.instagram.com/tenente.barbieratto/",
            posts: [
              { time: "11:45", type: "post", label: "Post" },
              { time: "14:45", type: "post", label: "Post" },
              { time: "17:45", type: "post", label: "Post" },
              { time: "20:45", type: "post", label: "Post" },
            ],
          },
          {
            platform: "youtube",
            handle: "@sentaoacao",
            url: "https://www.youtube.com/@sentaoacao",
            posts: [
              { time: "11:45", type: "video", label: "Vídeo" },
              { time: "14:45", type: "video", label: "Vídeo" },
              { time: "17:45", type: "video", label: "Vídeo" },
              { time: "20:45", type: "video", label: "Vídeo" },
            ],
          },
          {
            platform: "tiktok",
            handle: "@giovannibarbierat7",
            url: "https://www.tiktok.com/@giovannibarbierat7",
            posts: [
              { time: "11:45", type: "post", label: "Post" },
              { time: "14:45", type: "post", label: "Post" },
              { time: "17:45", type: "post", label: "Post" },
              { time: "20:45", type: "post", label: "Post" },
            ],
          },
          {
            platform: "tiktok",
            handle: "@sentaoaco",
            url: "https://www.tiktok.com/@sentaoaco",
            posts: [
              { time: "11:45", type: "post", label: "Post" },
              { time: "14:45", type: "post", label: "Post" },
              { time: "17:45", type: "post", label: "Post" },
              { time: "20:45", type: "post", label: "Post" },
            ],
          },
        ],
      },
    ],
  },
];

export async function runSeedIfEmpty(): Promise<boolean> {
  const { count } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0) return false;

  for (const c of SEED) {
    const { data: client, error: cErr } = await supabase
      .from("clients")
      .insert({
        name: c.name,
        avatar_initials: c.avatar_initials,
        color_hex: c.color_hex,
        category: c.category,
        status: "active",
      })
      .select()
      .single();
    if (cErr || !client) continue;

    for (const p of c.projects) {
      const { data: proj } = await supabase
        .from("projects")
        .insert({ client_id: client.id, name: p.name })
        .select()
        .single();
      if (!proj) continue;

      for (const sp of p.profiles) {
        const { data: prof } = await supabase
          .from("social_profiles")
          .insert({
            project_id: proj.id,
            platform: sp.platform,
            handle: sp.handle,
            url: sp.url,
          })
          .select()
          .single();
        if (!prof) continue;

        for (const post of sp.posts) {
          await supabase.from("scheduled_posts").insert({
            profile_id: prof.id,
            post_time: post.time,
            post_type: post.type,
            label: post.label,
            days: post.days ?? ALL,
          });
        }
      }
    }
  }
  return true;
}
