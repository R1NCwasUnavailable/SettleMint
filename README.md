# 🍃 SettleMint

SettleMint is a production-grade, AI-powered financial dashboard designed to completely eliminate the friction of group trip expenses. 

Instead of manually crunching numbers or wrestling with complex spreadsheets, SettleMint allows you to simply type what happened in natural language (e.g., *"Rahul paid ₹1000 for dinner, but Priya is vegan and didn't eat the meat"*). The AI instantly parses your intent, applies strict dietary exclusions, and uses a deterministic minimum-cash-flow algorithm to calculate the perfect settlement balances.

## 🚀 Key Features

*   **Magic Input (NLP Engine):** Powered by Google's Gemini 2.5 Flash and Vercel AI SDK, the Magic Input bar translates messy, real-world human text into strict JSON financial data.
*   **Deterministic Math Engine:** SettleMint uses the classic "Debt Simplification" (Minimum Cash Flow) algorithm under the hood. While the AI handles the natural language parsing, the actual arithmetic is strictly handled by bulletproof TypeScript functions to ensure 0% hallucination risk.
*   **Smart Preference Exclusions:** Automatically excludes vegetarians from meat expenses and non-drinkers from alcohol expenses based on their profile tags.
*   **Cloud Persistence:** Built on Supabase (PostgreSQL), ensuring all profiles, expenses, and states are instantly saved and synced to the cloud.
*   **Bento Box UI:** A gorgeous, responsive, glassmorphic React interface built with Next.js App Router.

## 🛠️ Tech Stack

*   **Framework:** Next.js 16 (App Router)
*   **Database:** Supabase (PostgreSQL)
*   **AI Engine:** Vercel AI SDK + Google Gemini 2.5 Flash
*   **Styling:** Vanilla CSS (Glassmorphism & CSS Grid)
*   **Validation:** Zod (Strict JSON Schema validation)
*   **Icons:** Lucide React

## 📦 Local Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/settlemint.git
cd settlemint
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory and add your API keys. **Never commit this file.**
```env
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SECRET_KEY=your_supabase_service_role_key
```

### 4. Supabase Database Setup
In your Supabase dashboard SQL Editor, run the following to create the required tables:
```sql
create table if not exists profiles (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null unique,
  preferences text
);

create table if not exists expenses (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  description text not null,
  amount numeric not null,
  paid_by text not null references profiles(name) on delete cascade,
  date text not null,
  split_between text[] not null
);

alter table profiles disable row level security;
alter table expenses disable row level security;
```

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to start splitting bills like magic!

## 🧠 Architecture Note
SettleMint intentionally separates Natural Language Processing from Financial Arithmetic. The LLM is restricted strictly to parsing intent (e.g. recognizing that "beers" = alcohol). Once the LLM returns the structured JSON expense, all calculations regarding `totalSpent` and `balances` are executed purely via TypeScript logic. This guarantees mathematical accuracy and prevents AI numerical hallucinations.
