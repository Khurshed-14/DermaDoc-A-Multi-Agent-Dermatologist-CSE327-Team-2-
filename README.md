# DermaDoc: A Multi Agent Dermatologist
A Project for CSE327 - Software Engineering | North South University

## DermaScan Frontend

A modern React + Vite landing page for DermaScan, an AI-powered skin health assistant.

### Tech Stack
- React 18
- Vite
- Tailwind CSS
- shadcn/ui components
- Lucide React (icons)

### Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Start the development server:
```bash
pnpm dev
```

3. Build for production:
```bash
pnpm build
```

4. Preview production build:
```bash
pnpm preview
```

### Project Structure
```
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui components
│   │   ├── Header.jsx
│   │   ├── Hero.jsx
│   │   ├── HowItWorks.jsx
│   │   ├── KeyFeatures.jsx
│   │   └── Footer.jsx
│   ├── lib/
│   │   └── utils.js     # Utility functions
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── components.json      # shadcn/ui configuration
├── tailwind.config.js   # Tailwind configuration
└── vite.config.js       # Vite configuration
```