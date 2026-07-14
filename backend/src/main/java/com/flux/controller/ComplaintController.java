package com.flux.controller;

import com.flux.model.entity.Complaint;
import com.flux.service.ComplaintService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complaints")
@RequiredArgsConstructor
public class ComplaintController {

    private final ComplaintService complaintService;

    @PostMapping
    public ResponseEntity<?> createComplaint(
            @RequestParam String complaintType,
            @RequestParam String description,
            @RequestParam(required = false) Long againstUserId,
            @RequestParam(required = false) Long bookingId,
            HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            Complaint complaint = complaintService.createComplaint(
                    userId, againstUserId, complaintType, description, bookingId);
            return ResponseEntity.ok(complaint);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/my-complaints")
    public ResponseEntity<?> getMyComplaints(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            List<Complaint> complaints = complaintService.getUserComplaints(userId);
            return ResponseEntity.ok(complaints);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/open")
    public ResponseEntity<?> getOpenComplaints() {
        try {
            List<Complaint> complaints = complaintService.getOpenComplaints();
            return ResponseEntity.ok(complaints);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<?> resolveComplaint(@PathVariable Long id, @RequestParam String resolution) {
        try {
            Complaint complaint = complaintService.resolveComplaint(id, resolution);
            return ResponseEntity.ok(complaint);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
