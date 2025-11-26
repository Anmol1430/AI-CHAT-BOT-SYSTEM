package com.mycollege.chatbotengine; // Must match your package name!

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@CrossOrigin(origins = "*") // VERY IMPORTANT: Allows Node.js (running on a different port) to access this.
@RestController // Marks this class as a Web API Controller
public class ChatbotController {

    @Autowired
    private ChatbotService chatbotService;

    // Class to represent the JSON data coming from Node.js
    private static class ChatRequest {
        public String query; // {"query": "User's question"}
    }

    // The specific address (endpoint): POST http://localhost:8080/respond
    @PostMapping("/respond")
    public Map<String, String> respondToQuery(@RequestBody ChatRequest request) {

        // Pass the user's question to the service logic
        String botResponse = chatbotService.getResponse(request.query);

        // Package the response into a JSON format: {"response": "Bot's answer"}
        Map<String, String> response = new HashMap<>();
        response.put("response", botResponse);

        return response;
    }
}