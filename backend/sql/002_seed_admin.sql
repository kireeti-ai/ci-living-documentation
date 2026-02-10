-- Seed an admin user (password: admin123)
-- The password hash below is for 'admin123' using bcrypt with 10 rounds
INSERT INTO users (email, username, password, role, is_active)
VALUES (
    'admin@example.com',
    'admin',
    '$2a$10$rQEY9hKFdggDqHSLqGJzyunKzpY9.kzZ3IxC/tLl1kIVyAn1dRMWq',
    'admin',
    true
);
