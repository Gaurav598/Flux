package com.flux.service;

import com.flux.model.enums.BookingStatus;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public final class BookingStateMachine {
    private static final Map<BookingStatus, Set<BookingStatus>> TRANSITIONS = new EnumMap<>(BookingStatus.class);

    static {
        TRANSITIONS.put(BookingStatus.PENDING, EnumSet.of(BookingStatus.BIDDING, BookingStatus.CANCELLED_BY_USER));
        TRANSITIONS.put(BookingStatus.BIDDING, EnumSet.of(BookingStatus.ACCEPTED, BookingStatus.CANCELLED_BY_USER, BookingStatus.NO_RIDERS_AVAILABLE));
        TRANSITIONS.put(BookingStatus.ACCEPTED, EnumSet.of(BookingStatus.RIDER_EN_ROUTE, BookingStatus.RIDER_ARRIVED, BookingStatus.CANCELLED_BY_USER, BookingStatus.CANCELLED_BY_RIDER));
        TRANSITIONS.put(BookingStatus.RIDER_EN_ROUTE, EnumSet.of(BookingStatus.RIDER_ARRIVED, BookingStatus.CANCELLED_BY_USER, BookingStatus.CANCELLED_BY_RIDER));
        TRANSITIONS.put(BookingStatus.RIDER_ARRIVED, EnumSet.of(BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED_BY_USER, BookingStatus.CANCELLED_BY_RIDER));
        TRANSITIONS.put(BookingStatus.IN_PROGRESS, EnumSet.of(BookingStatus.COMPLETED));
    }

    private BookingStateMachine() { }

    public static void requireTransition(BookingStatus from, BookingStatus to) {
        if (from == to) {
            return;
        }
        if (!TRANSITIONS.getOrDefault(from, Set.of()).contains(to)) {
            throw new IllegalStateException("Invalid booking transition: " + from + " -> " + to);
        }
    }

    public static boolean isTerminal(BookingStatus status) {
        return status == BookingStatus.COMPLETED
                || status == BookingStatus.CANCELLED_BY_USER
                || status == BookingStatus.CANCELLED_BY_RIDER
                || status == BookingStatus.NO_RIDERS_AVAILABLE;
    }
}
