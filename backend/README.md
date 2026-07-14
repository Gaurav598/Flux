# Flux Backend API

Spring Boot backend for the Flux - Ride-Hailing App & Real-Time Bidding Platform.

## Tech Stack

- **Framework:** Spring Boot 3.2.0
- **Language:** Java 17
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Message Queue:** Apache Kafka
- **Real-time:** WebSocket (STOMP)
- **Security:** JWT Authentication
- **Payment:** Stripe
- **SMS:** Twilio
- **Storage:** AWS S3

## Prerequisites

- Java 17+
- Docker & Docker Compose
- Gradle 8+

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flux
DB_USERNAME=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka
KAFKA_SERVERS=localhost:9092

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Twilio
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number

# Stripe
STRIPE_API_KEY=your-stripe-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
STRIPE_SUBSCRIPTION_PRICE_ID=your-price-id

# AWS
AWS_ACCESS_KEY=your-aws-key
AWS_SECRET_KEY=your-aws-secret
AWS_S3_BUCKET=flux-documents
AWS_REGION=us-east-1

# Google Maps
GOOGLE_MAPS_API_KEY=your-google-maps-key
```

## Running with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## Running Locally

```bash
# Start dependencies only
docker-compose up -d postgres redis kafka zookeeper

# Run the application
./gradlew bootRun

# Or build and run
./gradlew build
java -jar build/libs/flux-backend-1.0.0.jar
```

## API Documentation

Once running, access Swagger UI at:
```
http://localhost:8080/swagger-ui.html
```

## Key Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to mobile
- `POST /api/auth/verify-otp` - Verify OTP and login
- `POST /api/auth/rider/verify-otp` - Rider login

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/{id}` - Get booking details
- `GET /api/bookings/user/my-bookings` - User's bookings
- `PATCH /api/bookings/{id}/status` - Update status
- `POST /api/bookings/{id}/cancel` - Cancel booking
- `POST /api/bookings/{id}/rate` - Rate booking

### Bidding
- `POST /api/bids` - Place bid
- `GET /api/bids/booking/{bookingId}` - Get bids for booking
- `POST /api/bids/{bidId}/accept` - Accept bid
- `POST /api/bids/broadcast/{bookingId}` - Broadcast to riders

### Rider
- `POST /api/rider/apply` - Apply as rider
- `GET /api/rider/profile` - Get rider profile
- `PATCH /api/rider/documents` - Upload documents
- `PATCH /api/rider/location` - Update location
- `PATCH /api/rider/status` - Update availability

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/riders/pending` - Pending applications
- `POST /api/admin/riders/{id}/approve` - Approve rider
- `POST /api/admin/riders/{id}/reject` - Reject rider

## WebSocket Endpoints

Connect to `ws://localhost:8080/ws` for real-time updates:

- `/topic/booking/{bookingId}/bids` - Live bids for booking
- `/topic/rider/{riderId}/bookings` - New bookings for rider
- `/topic/user/{userId}/notifications` - User notifications

## Database Schema

The application uses JPA with automatic schema generation. Key tables:
- `users` - User accounts
- `riders` - Rider profiles and documents
- `bookings` - Ride/errand/parcel bookings
- `bids` - Rider bids on bookings
- `payments` - Subscription payments
- `notifications` - Push notifications
- `otp_verifications` - OTP codes
- `complaints` - User complaints

## Testing

```bash
# Run all tests
./gradlew test

# Run specific test
./gradlew test --tests com.flux.service.BookingServiceTest
```

## Production Deployment

1. Update `application.yml` with production values
2. Set strong JWT secret
3. Configure SSL/TLS
4. Set up monitoring (Prometheus/Grafana)
5. Configure log aggregation (ELK)
6. Set up CI/CD pipeline
7. Enable database backups
8. Configure auto-scaling

## License

Proprietary - All rights reserved
