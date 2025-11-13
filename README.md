# X Viral Score Analyzer

A full-stack web app that analyzes X (Twitter) posts to predict virality potential using AI. Upload text and images, get instant analysis with detailed scores and actionable suggestions.

![X Viral Score](https://img.shields.io/badge/X-Viral%20Score-blue)
![React](https://img.shields.io/badge/React-19.2.0-blue)
![Insforge](https://img.shields.io/badge/Powered%20by-Insforge-orange)

## ✨ Features

- 📝 **Text Analysis**: Enter your post content and get instant virality predictions
- 🖼️ **Image Support**: Upload images to enhance your analysis
- 🎯 **10-Factor Scoring**: Detailed breakdown across multiple virality factors
- 📊 **Visual Results**: Beautiful, easy-to-understand score visualization
- 💡 **Actionable Insights**: Get specific suggestions to improve your post
- 🚀 **Real-time Analysis**: Fast AI-powered analysis powered by GPT-4o

## 🛠️ Tech Stack

- **Frontend**: React 19 + Vite + Custom Doodle UI
- **Backend**: Insforge Edge Functions (TypeScript/Deno)
- **AI**: Insforge AI (OpenAI GPT-4o)
- **Database**: Insforge Postgres (with RLS)
- **Storage**: Insforge Storage
- **Deployment**: Vercel

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Insforge account (for backend)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/x-viral-score.git
cd x-viral-score
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (optional):
Create a `.env` file:
```env
VITE_INSFORGE_URL=https://your-backend.insforge.app
VITE_INSFORGE_API_KEY=your_api_key
```

4. Run development server:
```bash
npm run dev
```

5. Open `http://localhost:5173` in your browser

## 📦 Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment.

## 🌐 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Vercel will automatically detect Vite and configure the build
4. Add environment variables if needed
5. Deploy!

The app will be live at `https://your-app.vercel.app`

## 📁 Project Structure

```
/
├── api/
│   └── score.ts              # Insforge Edge Function for analysis
├── public/
│   └── insforge-logo.png     # Insforge logo
├── src/
│   ├── components/
│   │   ├── ErrorDialog.jsx   # Error display component
│   │   ├── ResultCard.jsx   # Results display component
│   │   └── RetroWindow.jsx   # Window wrapper component
│   ├── lib/
│   │   └── insforge.js       # Insforge SDK client
│   ├── styles/
│   │   ├── base.css          # Base styles
│   │   ├── components.css    # Component styles
│   │   └── variables.css     # CSS variables
│   ├── App.jsx               # Main app component
│   └── main.jsx              # Entry point
├── index.html
├── package.json
└── vite.config.js
```

## 🎯 How It Works

1. **User Input**: User enters text content and/or uploads images
2. **Image Upload**: Images are uploaded to Insforge Storage
3. **Edge Function**: Calls the `score` Edge Function with text and image URLs
4. **Database**: Creates initial record in `analyses` table immediately
5. **AI Analysis**: Edge Function calls Insforge AI (GPT-4o) for analysis
6. **Database Update**: Updates the record with analysis results
7. **Results Display**: Frontend displays the complete analysis

## 🔧 Edge Function

The Edge Function (`api/score.ts`) handles:
- Image URL processing
- AI analysis via Insforge AI
- Database record creation and updates
- Error handling and validation

Deploy it to Insforge using:
```bash
# Using Insforge MCP tools or CLI
insforge functions deploy score api/score.ts
```

## 📊 Database Schema

The `analyses` table stores:
- `id`: UUID primary key
- `user_id`: User ID (nullable for anonymous)
- `text_content`: Post text content
- `image_urls`: JSONB array of image URLs
- `overall_score`: 0-100 score
- `predicted_reach`: Low/Medium/High/Explosive
- `factors`: JSONB object with detailed factor scores
- `short_explanation`: Brief summary
- `detailed_reasons`: Array of detailed reasons
- `improvement_suggestions`: Array of suggestions
- `created_at`: Timestamp
- `updated_at`: Timestamp

## 🧪 Testing

Run tests:
```bash
npm test
```

Run tests with UI:
```bash
npm run test:ui
```

## 📝 License

MIT License

## 👤 Author

**Sam Liu**
- LinkedIn: [sam-liu-025b871a2](https://www.linkedin.com/in/sam-liu-025b871a2/)
- Made with ❤️ using [Insforge](https://insforge.dev/)

## 🙏 Acknowledgments

- Built with [Insforge](https://insforge.dev/) - The Backend Platform Built for AI Agents
- Powered by OpenAI GPT-4o for AI analysis
