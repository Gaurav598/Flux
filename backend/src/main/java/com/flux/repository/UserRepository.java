package com.flux.repository;

import com.flux.model.entity.User;
import com.flux.model.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByMobileNumber(String mobileNumber);
    boolean existsByMobileNumber(String mobileNumber);
    long countByRole(UserRole role);
    List<User> findByFullNameContainingIgnoreCaseOrMobileNumberContaining(String name, String mobile);
}
