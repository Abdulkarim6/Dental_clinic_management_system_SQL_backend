CREATE TABLE IF NOT EXISTS treatments (
    treatment_id INT AUTO_INCREMENT PRIMARY KEY,

    appointment_id INT NOT NULL,

    diagnosis VARCHAR(255) NOT NULL,
    treatment_details TEXT NOT NULL,
    notes TEXT DEFAULT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (appointment_id)
    REFERENCES appointments(appointment_id),

    UNIQUE KEY unique_appointment_treatment (
        appointment_id
    )
);