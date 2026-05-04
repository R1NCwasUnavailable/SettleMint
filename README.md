# 🌿 SettleMint

SettleMint is an AI-powered, intelligent accountant for group trips and hangouts. Instead of manually calculating who owes whom and dealing with complex spreadsheets, simply tell SettleMint your expenses in natural language, and it will handle the rest.

## ✨ Features
* **Natural Language Processing:** Just type "John paid $50 for gas, but Sarah only owes $10" and SettleMint understands perfectly.
* **Smart Context Profiles:** Store group members and their dietary or personal preferences (e.g., "Sarah is vegan"). The AI remembers this context for all future math calculations.
* **Instant Balances:** Generate a perfect, readable markdown ledger showing exactly who owes who on demand.
* **Modern UI:** Built with a beautiful, dark-mode glassmorphism aesthetic.

---

## 🚀 Getting Started (For Collaborators)

If you've been invited to collaborate on this repository, follow these steps to get the app running locally on your machine.

### 1. Clone the repository
```bash
git clone https://github.com/R1NCwasUnavailable/SettleMint.git
cd SettleMint
```

### 2. Install dependencies
Ensure you have Node.js installed, then run:
```bash
npm install
```

### 3. Set up your Environment Variables 🔑 (CRITICAL STEP)
Because API keys are sensitive, our `.gitignore` file explicitly ignores `.env.local` files so they don't accidentally get pushed to GitHub. 

When you cloned this repo, **the `.env.local` file was not included.** You must create your own!

1. Create a new file in the root directory and name it EXACTLY `.env.local`
2. Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and generate a free Gemini API Key.
3. Open your new `.env.local` file and add the following line:
```env
VITE_GEMINI_API_KEY=your_api_key_here
```

### 4. Run the Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 🛠️ Tech Stack
* **Frontend Framework:** React 19 + Vite
* **Language:** TypeScript
* **Styling:** Vanilla CSS (Glassmorphism design system)
* **AI Integration:** Vercel AI SDK (`@ai-sdk/google`)
* **LLM:** Google `gemini-2.5-flash`
* **Icons:** Lucide React
* **Markdown:** React Markdown
