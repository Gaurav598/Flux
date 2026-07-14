# Flux Admin Dashboard

Modern admin dashboard built with React, Vite, and Tailwind CSS for managing the Flux platform.

## Features

### 📊 Dashboard
- Real-time statistics (users, riders, bookings, revenue)
- Weekly booking and revenue charts
- Service distribution analytics
- Top riders leaderboard
- Recent activity feed

### ✅ Rider Verification
- Review pending rider applications
- View all uploaded documents
- Approve or reject applications with reasons
- Document download and full-screen view

### 🗺️ Live Monitoring
- Real-time map showing all active rides
- Rider locations and booking status
- Filter by service type
- Booking details on map markers

### 👥 User Management
- View all users and riders
- Search and filter capabilities
- User details and booking history
- Account status management

### 📋 Booking Management
- View all bookings with filters
- Booking details and timeline
- Status tracking
- Revenue analytics

### 💬 Complaint Management
- View and resolve complaints
- Priority and status tracking
- User and rider complaint history

### ⚙️ Settings
- Platform configuration
- Fare settings
- Bidding window configuration
- Service area management
- Notification settings

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Recharts** - Data visualization
- **React Leaflet** - Maps
- **Axios** - API client
- **Zustand** - State management
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

Create `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

## Development

```bash
# Start dev server
npm run dev

# Dashboard runs on http://localhost:3000
```

## Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/       # Reusable components
│   └── Layout.tsx   # Main layout with sidebar
├── pages/           # Page components
│   ├── Dashboard.tsx
│   ├── RiderVerification.tsx
│   ├── LiveMonitoring.tsx
│   ├── Users.tsx
│   ├── Bookings.tsx
│   ├── Complaints.tsx
│   └── Settings.tsx
├── lib/             # Utilities
│   └── api.ts       # Axios instance
├── App.tsx          # Root component
└── main.tsx         # Entry point
```

## API Integration

The dashboard connects to the Spring Boot backend at `/api/admin/*` endpoints:

- `GET /admin/dashboard` - Dashboard statistics
- `GET /admin/riders/pending` - Pending rider applications
- `POST /admin/riders/{id}/approve` - Approve rider
- `POST /admin/riders/{id}/reject` - Reject rider
- `GET /admin/riders/active` - Active riders
- `GET /admin/bookings/active` - Active bookings

## Authentication

Admin login uses JWT tokens stored in localStorage. The API client automatically:
- Adds Authorization header to requests
- Redirects to login on 401 responses
- Handles token refresh

## Deployment

### Build and Deploy

```bash
# Build for production
npm run build

# Deploy dist/ folder to:
# - Vercel
# - Netlify
# - AWS S3 + CloudFront
# - Any static hosting
```

### Environment Variables

Set in production:
- `VITE_API_BASE_URL` - Production API URL

## License

Proprietary - All rights reserved
