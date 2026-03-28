/** Must match the agent pipeline in `src/inngest/functions.ts`. */
export const AGENT_PROMPT_VERSION = "v6-hosted-stream-bridge" as const;

export const PROJECT_TEMPLATES = [
  {
    emoji: "🛬",
    title: "Landing page",
    prompt:
      "Build a modern marketing landing page: hero with headline and CTA, feature grid, social proof section, pricing teaser, FAQ, and footer. Use Tailwind only, responsive layout, and polished typography.",
  },
  {
    emoji: "📊",
    title: "Analytics dashboard",
    prompt:
      "Build a compact analytics dashboard: sidebar nav, KPI stat cards, simple chart placeholder, recent activity table with filters, and dark-friendly styling. Use local mock data.",
  },
  {
    emoji: "💳",
    title: "SaaS starter",
    prompt:
      "Build a minimal SaaS app shell: marketing header, sign-in CTA placeholders, dashboard layout with sidebar, empty state, and settings-style panel using mock data only.",
  },
  {
    emoji: "🎬",
    title: "Build a Netflix clone",
    prompt:
      "Build a Netflix-style homepage with a hero banner (use a nice, dark-mode compatible gradient here), movie sections, responsive cards, and a modal for viewing details using mock data and local state. Use dark mode.",
  },
  {
    emoji: "📦",
    title: "Build an admin dashboard",
    prompt:
      "Create an admin dashboard with a sidebar, stat cards, a chart placeholder, and a basic table with filter and pagination using local state. Use clear visual grouping and balance in your design for a modern, professional look.",
  },
  {
    emoji: "📋",
    title: "Build a kanban board",
    prompt:
      "Build a kanban board with drag-and-drop using react-beautiful-dnd and support for adding and removing tasks with local state. Use consistent spacing, column widths, and hover effects for a polished UI.",
  },
  {
    emoji: "🗂️",
    title: "Build a file manager",
    prompt:
      "Build a file manager with folder list, file grid, and options to rename or delete items using mock data and local state. Focus on spacing, clear icons, and visual distinction between folders and files.",
  },
  {
    emoji: "📺",
    title: "Build a YouTube clone",
    prompt:
      "Build a YouTube-style homepage with mock video thumbnails, a category sidebar, and a modal preview with title and description using local state. Ensure clean alignment and a well-organized grid layout.",
  },
  {
    emoji: "🛍️",
    title: "Build a store page",
    prompt:
      "Build a store page with category filters, a product grid, and local cart logic to add and remove items. Focus on clear typography, spacing, and button states for a great e-commerce UI.",
  },
  {
    emoji: "🏡",
    title: "Build an Airbnb clone",
    prompt:
      "Build an Airbnb-style listings grid with mock data, filter sidebar, and a modal with property details using local state. Use card spacing, soft shadows, and clean layout for a welcoming design.",
  },
  {
    emoji: "🎵",
    title: "Build a Spotify clone",
    prompt:
      "Build a Spotify-style music player with a sidebar for playlists, a main area for song details, and playback controls. Use local state for managing playback and song selection. Prioritize layout balance and intuitive control placement for a smooth user experience. Use dark mode.",
  },
] as const;

export const MAX_SEGMENTS = 4;

export const SANDBOX_TIMEOUT_IN_MS = 60_000 * 10 * 3; // 30 mins
