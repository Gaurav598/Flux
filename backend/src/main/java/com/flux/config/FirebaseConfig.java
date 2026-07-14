package com.flux.config;

// Trigger build: 2026-03-12 23:56

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.messaging.FirebaseMessaging;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.FileInputStream;  
import java.io.IOException;



@Configuration
@Slf4j
public class FirebaseConfig{ 
     
    @Value("${firebase.credentials-path:}")
    private String firebaseCredentialsPath;
    @Bean
    public FirebaseAuth firebaseAuth() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
            GoogleCredentials credentials;
            
            if (firebaseCredentialsPath != null && !firebaseCredentialsPath.isEmpty()) {
                credentials = GoogleCredentials.fromStream(new FileInputStream(firebaseCredentialsPath));
            } else {
                credentials = GoogleCredentials.getApplicationDefault();
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(credentials)
                    .build();

            FirebaseApp.initializeApp(options);
            log.info("Firebase initialized successfully");
        }

        return FirebaseAuth.getInstance();
    }

    @Bean
    public FirebaseMessaging firebaseMessaging(FirebaseAuth firebaseAuth) {
        return FirebaseMessaging.getInstance();
    }
}
