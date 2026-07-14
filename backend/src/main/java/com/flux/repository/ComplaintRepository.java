package com.flux.repository;

import com.flux.model.entity.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    List<Complaint> findByFiledById(Long userId);
    List<Complaint> findByAgainstUserId(Long userId);
    List<Complaint> findByStatus(String status);
    long countByStatus(String status);
}
