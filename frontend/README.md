# RoadPulse AI - React Dashboard Frontend

Modern React + Vite + Tailwind CSS dashboard for the AI Road Damage Assessment System.

## Features
- **Upload Screen (`/upload`, `/`)**: Drag-and-drop or click-to-browse image upload with instant thumbnail preview and confidence threshold slider.
- **Results Screen (`/results/:id`)**: Large annotated road surface viewer (with original/annotated toggle), health score hero card, Recharts damage frequency chart, and detailed detection log table.
- **History Screen (`/history`)**: Sortable and filterable table of past inspections with thumbnails, severity badges, and one-click report view.
- **Consistent Design System**: Unified color palette for Severity (Low, Medium, High), Condition (Good, Fair, Poor, Critical), and Damage Classes (D00, D10, D20, D40).
- **Backend Health Monitor**: Real-time pill indicator showing whether the FastAPI server is online.

## Getting Started

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Production Build
```bash
npm run build
```

## Environment Configuration
The backend base URL defaults to `http://127.0.0.1:8000`. You can configure it via `.env`:
```env
VITE_API_URL=http://127.0.0.1:8000
```
