package com.flux.service;

import com.flux.model.entity.Bid;
import com.flux.model.entity.Booking;
import com.flux.model.entity.Rider;
import com.flux.model.entity.User;
import com.flux.model.enums.BidStatus;
import com.flux.model.enums.BookingStatus;
import com.flux.model.enums.RiderStatus;
import com.flux.model.enums.ServiceType;
import com.flux.model.enums.UserRole;
import com.flux.repository.BidRepository;
import com.flux.repository.BookingRepository;
import com.flux.repository.RiderRepository;
import com.flux.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.bidding.window-seconds=45",
        "app.bidding.min-bid=40",
        "app.bidding.max-bid=5000"
})
@Import({BookingService.class, BiddingService.class, RiderService.class, UserService.class})
@Testcontainers(disabledWithoutDocker = true)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class BookingConcurrencyPostgresTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("flux_test")
            .withUsername("flux")
            .withPassword("flux");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired BookingService bookingService;
    @Autowired BiddingService biddingService;
    @Autowired UserRepository userRepository;
    @Autowired RiderRepository riderRepository;
    @Autowired BookingRepository bookingRepository;
    @Autowired BidRepository bidRepository;

    @MockBean NotificationService notificationService;
    @MockBean SimpMessagingTemplate messagingTemplate;

    @BeforeEach
    void cleanDatabase() {
        bidRepository.deleteAll();
        bookingRepository.deleteAll();
        riderRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void twoRidersCompetingForSameBookingProduceOneAssignment() throws Exception {
        User customer = saveUser("+910000000001", UserRole.USER);
        Rider first = saveRider("+910000000002");
        Rider second = saveRider("+910000000003");
        Booking booking = saveBooking(customer, 500.0);

        List<Boolean> results = race(
                () -> bookingService.acceptUserPrice(booking.getId(), first.getUser().getId()),
                () -> bookingService.acceptUserPrice(booking.getId(), second.getUser().getId())
        );

        Booking persisted = bookingRepository.findById(booking.getId()).orElseThrow();
        assertEquals(1, results.stream().filter(Boolean::booleanValue).count());
        assertEquals(BookingStatus.ACCEPTED, persisted.getStatus());
        assertTrue(persisted.getRider().getId().equals(first.getId())
                || persisted.getRider().getId().equals(second.getId()));
    }

    @Test
    void oneRiderCannotAcceptTwoSeparateBookingsConcurrently() throws Exception {
        User firstCustomer = saveUser("+910000000011", UserRole.USER);
        User secondCustomer = saveUser("+910000000012", UserRole.USER);
        Rider rider = saveRider("+910000000013");
        Booking first = saveBooking(firstCustomer, 500.0);
        Booking second = saveBooking(secondCustomer, 600.0);

        List<Boolean> results = race(
                () -> bookingService.acceptUserPrice(first.getId(), rider.getUser().getId()),
                () -> bookingService.acceptUserPrice(second.getId(), rider.getUser().getId())
        );

        Booking firstPersisted = bookingRepository.findById(first.getId()).orElseThrow();
        Booking secondPersisted = bookingRepository.findById(second.getId()).orElseThrow();
        assertEquals(1, results.stream().filter(Boolean::booleanValue).count());
        assertNotEquals(firstPersisted.getStatus(), secondPersisted.getStatus());
        assertEquals(1, List.of(firstPersisted, secondPersisted).stream()
                .filter(item -> item.getStatus() == BookingStatus.ACCEPTED).count());
    }

    @Test
    void cancellationRacingBidAcceptanceCannotLeaveAnActivePendingBid() throws Exception {
        User customer = saveUser("+910000000021", UserRole.USER);
        Rider rider = saveRider("+910000000022");
        Booking booking = saveBooking(customer, 500.0);
        Bid bid = bidRepository.save(Bid.builder()
                .booking(booking)
                .rider(rider)
                .bidAmount(520.0)
                .status(BidStatus.PENDING)
                .build());

        race(
                () -> biddingService.acceptBid(bid.getId(), customer.getId()),
                () -> bookingService.cancelBookingAsActor(
                        booking.getId(), "Customer cancelled", customer.getId(), "USER")
        );

        Booking persisted = bookingRepository.findById(booking.getId()).orElseThrow();
        Bid persistedBid = bidRepository.findById(bid.getId()).orElseThrow();
        assertTrue(BookingStateMachine.isTerminal(persisted.getStatus())
                || persisted.getStatus() == BookingStatus.ACCEPTED);
        assertNotEquals(BidStatus.PENDING, persistedBid.getStatus());
    }

    @Test
    void directAcceptanceCompetingWithBidAcceptanceProducesOneAssignment() throws Exception {
        User customer = saveUser("+910000000031", UserRole.USER);
        Rider directRider = saveRider("+910000000032");
        Rider biddingRider = saveRider("+910000000033");
        Booking booking = saveBooking(customer, 500.0);
        Bid bid = bidRepository.save(Bid.builder()
                .booking(booking)
                .rider(biddingRider)
                .bidAmount(480.0)
                .status(BidStatus.PENDING)
                .build());

        List<Boolean> results = race(
                () -> bookingService.acceptUserPrice(booking.getId(), directRider.getUser().getId()),
                () -> biddingService.acceptBid(bid.getId(), customer.getId())
        );

        Booking persisted = bookingRepository.findById(booking.getId()).orElseThrow();
        Bid persistedBid = bidRepository.findById(bid.getId()).orElseThrow();
        assertEquals(1, results.stream().filter(Boolean::booleanValue).count());
        assertEquals(BookingStatus.ACCEPTED, persisted.getStatus());
        assertTrue(persisted.getRider().getId().equals(directRider.getId())
                || persisted.getRider().getId().equals(biddingRider.getId()));
        assertNotEquals(BidStatus.PENDING, persistedBid.getStatus());
    }

    private List<Boolean> race(ThrowingAction first, ThrowingAction second) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<Boolean> firstResult = executor.submit(() -> runAfterBarrier(first, ready, start));
            Future<Boolean> secondResult = executor.submit(() -> runAfterBarrier(second, ready, start));
            ready.await();
            start.countDown();
            return List.of(firstResult.get(), secondResult.get());
        } finally {
            executor.shutdownNow();
        }
    }

    private boolean runAfterBarrier(ThrowingAction action, CountDownLatch ready, CountDownLatch start) {
        ready.countDown();
        try {
            start.await();
            action.run();
            return true;
        } catch (Exception expectedConflict) {
            return false;
        }
    }

    private User saveUser(String mobile, UserRole role) {
        return userRepository.save(User.builder()
                .mobileNumber(mobile)
                .fullName(role + " " + mobile)
                .role(role)
                .build());
    }

    private Rider saveRider(String mobile) {
        User user = saveUser(mobile, UserRole.RIDER);
        LocalDateTime now = LocalDateTime.now();
        return riderRepository.save(Rider.builder()
                .user(user)
                .vehicleType("Bike")
                .status(RiderStatus.AVAILABLE)
                .subscriptionActive(true)
                .subscriptionStartDate(now.minusDays(1))
                .subscriptionEndDate(now.plusDays(30))
                .build());
    }

    private Booking saveBooking(User customer, double fare) {
        LocalDateTime now = LocalDateTime.now();
        return bookingRepository.save(Booking.builder()
                .user(customer)
                .serviceType(ServiceType.RIDE)
                .status(BookingStatus.BIDDING)
                .pickupAddress("Pickup")
                .pickupLatitude(28.61)
                .pickupLongitude(77.20)
                .dropAddress("Drop")
                .dropLatitude(28.62)
                .dropLongitude(77.21)
                .estimatedFare(fare)
                .userEnteredAmount(fare)
                .vehicleType("Bike")
                .biddingStartTime(now)
                .biddingEndTime(now.plusMinutes(5))
                .build());
    }

    @FunctionalInterface
    private interface ThrowingAction {
        void run() throws Exception;
    }
}
