package com.flux.service;

import com.flux.model.enums.BookingStatus;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class BookingStateMachineTest {

    @Test
    void permitsSupportedRideLifecycle() {
        assertDoesNotThrow(() -> BookingStateMachine.requireTransition(BookingStatus.BIDDING, BookingStatus.ACCEPTED));
        assertDoesNotThrow(() -> BookingStateMachine.requireTransition(BookingStatus.ACCEPTED, BookingStatus.RIDER_ARRIVED));
        assertDoesNotThrow(() -> BookingStateMachine.requireTransition(BookingStatus.RIDER_ARRIVED, BookingStatus.IN_PROGRESS));
        assertDoesNotThrow(() -> BookingStateMachine.requireTransition(BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED));
    }

    @Test
    void rejectsTerminalAndOutOfOrderTransitions() {
        assertThrows(IllegalStateException.class,
                () -> BookingStateMachine.requireTransition(BookingStatus.COMPLETED, BookingStatus.IN_PROGRESS));
        assertThrows(IllegalStateException.class,
                () -> BookingStateMachine.requireTransition(BookingStatus.BIDDING, BookingStatus.COMPLETED));
        assertThrows(IllegalStateException.class,
                () -> BookingStateMachine.requireTransition(BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED_BY_USER));
    }
}
