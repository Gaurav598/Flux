package com.flux.service;

import com.flux.model.entity.Complaint;
import com.flux.model.entity.User;
import com.flux.repository.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final UserService userService;

    @Transactional
    public Complaint createComplaint(Long filedByUserId, Long againstUserId, 
                                     String complaintType, String description, 
                                     Long bookingId) {
        User filedBy = userService.getUserById(filedByUserId);
        User againstUser = againstUserId != null ? userService.getUserById(againstUserId) : null;

        Complaint complaint = Complaint.builder()
                .filedBy(filedBy)
                .againstUser(againstUser)
                .complaintType(complaintType)
                .description(description)
                .priority("MEDIUM")
                .status("OPEN")
                .build();

        Complaint savedComplaint = complaintRepository.save(complaint);
        log.info("Complaint created: {} by user: {}", savedComplaint.getId(), filedByUserId);
        return savedComplaint;
    }

    public List<Complaint> getUserComplaints(Long userId) {
        return complaintRepository.findByFiledById(userId);
    }

    public List<Complaint> getComplaintsAgainstUser(Long userId) {
        return complaintRepository.findByAgainstUserId(userId);
    }

    public List<Complaint> getOpenComplaints() {
        return complaintRepository.findByStatus("OPEN");
    }

    @Transactional
    public Complaint resolveComplaint(Long complaintId, String resolution) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));

        complaint.setStatus("RESOLVED");
        complaint.setResolution(resolution);
        complaint.setResolvedAt(LocalDateTime.now());

        Complaint savedComplaint = complaintRepository.save(complaint);
        log.info("Complaint resolved: {}", complaintId);
        return savedComplaint;
    }

    public long getOpenComplaintCount() {
        return complaintRepository.countByStatus("OPEN");
    }
}
