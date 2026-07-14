package com.flux.dto;

import lombok.Data;

@Data
public class BookingRequest {
    private String serviceType;
    private String vehicleType;
    private String pickupAddress;
    private Double pickupLatitude;
    private Double pickupLongitude;
    private String dropAddress;
    private Double dropLatitude;
    private Double dropLongitude;
    private String description;
    private Double estimatedBudget;
    private String parcelDescription;
    private String parcelWeight;
    private String recipientName;
    private String recipientPhone;
    private Double estimatedDistance;
    private Integer estimatedDuration;
    private Double userEnteredAmount;
}
