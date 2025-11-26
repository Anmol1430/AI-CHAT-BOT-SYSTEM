package com.mycollege.chatbotengine;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

/**
 * This is the main entry point of the Java Chatbot Engine application.
 * It initializes the Spring Boot framework and starts the embedded Tomcat server on port 8080.
 */
@SpringBootApplication
// This annotation tells Spring where to look for your other components (@Service, @RestController).
// This fixes the "cannot find symbol" or "cannot find bean" errors.
@ComponentScan(basePackages = "com.mycollege.chatbotengine")
public class ChatbotEngineApplication {

    public static void main(String[] args) {
        // This line runs the Spring Boot application.
        SpringApplication.run(ChatbotEngineApplication.class, args);
    }

}