package com.flux.security;

import com.flux.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import com.flux.model.entity.User;
import com.flux.model.enums.AccountStatus;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserService userService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        final String authorizationHeader = request.getHeader("Authorization");

        String mobileNumber = null;
        String jwt = null;

        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            jwt = authorizationHeader.substring(7);
            try {
                mobileNumber = jwtUtil.extractMobileNumber(jwt);
            } catch (Exception e) {
                logger.error("JWT token extraction failed", e);
            }
        }

        if (mobileNumber != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                if (jwtUtil.validateToken(jwt, mobileNumber) && jwtUtil.isAccessToken(jwt)) {
                    String role = jwtUtil.extractRole(jwt);
                    Long userId = jwtUtil.extractUserId(jwt);
                    User user = userService.getUserById(userId);
                    if (user.getStatus() == AccountStatus.ACTIVE
                            && user.getMobileNumber().equals(mobileNumber)
                            && user.getRole().name().equals(role)) {
                        UsernamePasswordAuthenticationToken authenticationToken =
                                new UsernamePasswordAuthenticationToken(
                                        mobileNumber,
                                        null,
                                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role)));
                        authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                        request.setAttribute("userId", userId);
                        request.setAttribute("userRole", role);
                        SecurityContextHolder.getContext().setAuthentication(authenticationToken);
                    }
                }
            } catch (RuntimeException exception) {
                logger.debug("JWT rejected because the account is unavailable or changed", exception);
            }
        }
        
        filterChain.doFilter(request, response);
    }
}
