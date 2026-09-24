package com.flux.service;

import com.flux.model.entity.Booking;
import com.flux.model.entity.Rider;
import com.flux.model.entity.User;
import com.flux.model.enums.BookingStatus;
import com.flux.repository.BidRepository;
import com.flux.repository.BookingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {
    @Mock BookingRepository bookingRepository;
    @Mock BidRepository bidRepository;
    @Mock UserService userService;
    @Mock RiderService riderService;
    @Mock NotificationService notificationService;

    private BookingService service;

    @BeforeEach
    void setUp() {
        service = new BookingService(bookingRepository, bidRepository, userService, riderService, notificationService);
        lenient().when(bookingRepository.save(any(Booking.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void directAcceptanceMapsAuthenticatedUserToRiderProfile() {
        User customer = user(1L);
        User riderUser = user(22L);
        Rider rider = rider(7L, riderUser);
        Booking booking = booking(100L, customer, BookingStatus.BIDDING, null, 500.0);
        booking.setBiddingEndTime(LocalDateTime.now().plusMinutes(1));
        booking.setUserEnteredAmount(500.0);

        when(bookingRepository.findByIdWithLock(100L)).thenReturn(Optional.of(booking));
        when(riderService.getRiderByUserId(22L)).thenReturn(rider);
        when(riderService.getRiderByIdWithLock(7L)).thenReturn(rider);
        when(bookingRepository.findByRiderIdAndStatusIn(any(), any())).thenReturn(List.of());
        when(bidRepository.findByBookingIdAndStatus(any(), any())).thenReturn(List.of());

        Booking accepted = service.acceptUserPrice(100L, 22L);

        assertEquals(BookingStatus.ACCEPTED, accepted.getStatus());
        assertEquals(7L, accepted.getRider().getId());
        assertEquals(500.0, accepted.getFinalFare());
        verify(riderService).getRiderByUserId(22L);
        verify(riderService, never()).getRiderByIdWithLock(22L);
    }

    @Test
    void rejectsUnauthorizedCancellation() {
        Booking booking = booking(100L, user(1L), BookingStatus.ACCEPTED, rider(7L, user(2L)), 500.0);
        when(bookingRepository.findByIdWithLock(100L)).thenReturn(Optional.of(booking));

        assertThrows(AccessDeniedException.class,
                () -> service.cancelBookingAsActor(100L, "not my booking", 99L, "USER"));
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void rejectsUnauthorizedStatusUpdate() {
        assertThrows(AccessDeniedException.class,
                () -> service.updateBookingStatusAsActor(100L, BookingStatus.COMPLETED, "RIDER"));
        verify(bookingRepository, never()).findByIdWithLock(any());
    }

    @Test
    void rejectsUnauthorizedRating() {
        Booking booking = booking(100L, user(1L), BookingStatus.COMPLETED, rider(7L, user(2L)), 500.0);
        when(bookingRepository.findByIdWithLock(100L)).thenReturn(Optional.of(booking));

        assertThrows(AccessDeniedException.class,
                () -> service.rateBookingAsActor(100L, 99L, 5, "great", null, null));
    }

    @Test
    void rejectsUnauthorizedAndIncorrectOtpVerification() {
        Booking booking = booking(100L, user(1L), BookingStatus.RIDER_ARRIVED, rider(7L, user(2L)), 500.0);
        booking.setVerificationOtp("1234");
        booking.setVerificationOtpExpiresAt(LocalDateTime.now().plusMinutes(5));
        booking.setVerificationOtpAttempts(0);
        when(bookingRepository.findByIdWithLock(100L)).thenReturn(Optional.of(booking));

        assertThrows(RuntimeException.class,
                () -> service.verifyOtpAndStartRide(100L, 99L, "1234"));
        assertThrows(IllegalArgumentException.class,
                () -> service.verifyOtpAndStartRide(100L, 2L, "9999"));
        assertEquals(1, booking.getVerificationOtpAttempts());
        assertEquals(BookingStatus.RIDER_ARRIVED, booking.getStatus());
    }

    @ParameterizedTest
    @ValueSource(doubles = {100.0, 500.0, 1920.0, 2000.0})
    void completedRidePaysFullFareWithoutPerRideCommission(double fare) {
        Rider rider = rider(7L, user(2L));
        Booking booking = booking(100L, user(1L), BookingStatus.IN_PROGRESS, rider, fare);
        when(bookingRepository.findByIdWithLock(100L)).thenReturn(Optional.of(booking));

        Booking completed = service.completeRide(100L, 2L);

        assertEquals(BookingStatus.COMPLETED, completed.getStatus());
        assertEquals(fare, completed.getRiderEarning());
        assertEquals(0.0, completed.getCompanyCommission());
    }

    private static User user(Long id) {
        return User.builder().id(id).fullName("User " + id).mobileNumber("+910000000" + id).build();
    }

    private static Rider rider(Long id, User user) {
        return Rider.builder().id(id).user(user).vehicleType("Bike").build();
    }

    private static Booking booking(Long id, User user, BookingStatus status, Rider rider, Double fare) {
        return Booking.builder()
                .id(id)
                .user(user)
                .rider(rider)
                .status(status)
                .vehicleType("Bike")
                .finalFare(fare)
                .build();
    }
}
