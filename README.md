# Kannan S — Portfolio

> Personal portfolio website showcasing full-stack development, real-time systems, and interactive UI engineering.

🔗 **Live:** [kannann.me](https://kannann.me)

---

## 🚀 Highlights & Features

- **Interactive Pixel Magnet Hero**: Custom HTML5 canvas particle physics that react to mouse and touch movements, with a zero-delay SSR fallback and responsive font scaling.
- **Animated Code Terminal**: Interactive real-time typing JSON terminal featuring macOS-style window controls.
- **Voice Note Messaging**: In-browser voice recorder with live audio frequency visualizers, container-level WebM duration validation, Supabase Storage persistence, and instant Resend email notifications with secure 7-day signed playback links.
- **Modern Minimalist Aesthetic**: Book-margin layout, sleek typography, micro-animations, and full responsive design across mobile, tablet, and desktop viewports.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **UI & Styling**: [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/)
- **Audio & Media**: HTML5 `MediaRecorder`, Web Audio API (`AudioContext`, `AnalyserNode`), `music-metadata`
- **Storage & Database**: [Supabase](https://supabase.com/) (Storage & Postgres)
- **Email Delivery**: [Resend](https://resend.com/)
- **Deployment**: [Vercel](https://vercel.com/)

---

## ⚙️ Getting Started Locally

### 1. Clone the repository
```bash
git clone https://github.com/kannanCodes/Portfolio.git
cd Portfolio
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env.local` file in the root directory:
```env
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=onboarding@resend.dev
CONTACT_EMAIL=your_email@example.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Build & Production

```bash
# Build production bundle
npm run build

# Start production server
npm run start
```

---

## 👤 Author

**Kannan S** — MERN Stack Developer
- **GitHub**: [@kannanCodes](https://github.com/kannanCodes)
- **LinkedIn**: [kannan-dev](https://www.linkedin.com/in/kannan-dev/)
- **Email**: [hello.kannan.s@gmail.com](mailto:hello.kannan.s@gmail.com)
