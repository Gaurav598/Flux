# FLUX Admin Dashboard

Production-ready admin dashboard for managing the FLUX ride-booking platform.

## Features

- **Analytics Dashboard** - Real-time metrics for users, riders, bookings, and revenue
- **Rider Management** - Approve, reject, suspend, or activate riders with filtering
- **Booking Management** - View and manage all bookings with status tracking
- **User Management** - Search and view user details and booking history
- **Modern UI** - Built with React, TypeScript, TailwindCSS, and Lucide icons

## Tech Stack

- React 18
- TypeScript
- Vite
- TailwindCSS
- React Router v6
- TanStack Query (React Query)
- Recharts for analytics
- Axios for API calls

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

The dashboard will be available at `http://localhost:3001`

3. Build for production:
```bash
npm run build
```

## API Configuration

The dashboard connects to the backend at `http://localhost:8080/api/admin`. Make sure the backend server is running.

## Admin Authentication

Currently uses JWT token stored in localStorage. Set the admin token after login:
```javascript
localStorage.setItem('adminToken', 'your-jwt-token');
```

## Pages

- `/dashboard` - Analytics overview
- `/riders` - Rider management (approve, reject, suspend, activate)
- `/bookings` - Booking management with filters
- `/users` - User management with search
