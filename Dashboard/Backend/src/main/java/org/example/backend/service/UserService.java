package org.example.backend.service;

import org.example.backend.dto.AuthResponse;
import org.example.backend.dto.LoginRequest;
import org.example.backend.dto.RegisterRequest;
import org.example.backend.dto.UserResponse;
import org.example.backend.model.Users;
import org.example.backend.repo.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JWTService jwtService;

    public UserResponse register(RegisterRequest request) {
        // Check if username already exists
        if (userRepo.findByUsername(request.getUsername()) != null) {
            throw new RuntimeException("Username already exists");
        }

        Users user = new Users();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole() != null ? request.getRole() : "USER");

        Users savedUser = userRepo.save(user);
        return new UserResponse(savedUser.getId(), savedUser.getUsername(), savedUser.getRole());
    }

    public AuthResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );

            if (authentication.isAuthenticated()) {
                Users user = userRepo.findByUsername(request.getUsername());
                String token = jwtService.generateToken(user.getUsername(), user.getRole());
                return new AuthResponse(token, user.getUsername(), user.getRole());
            }
        } catch (Exception e) {
            throw new RuntimeException("Invalid username or password");
        }

        throw new RuntimeException("Authentication failed");
    }
}