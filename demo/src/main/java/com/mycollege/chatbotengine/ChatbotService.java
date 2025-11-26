package com.mycollege.chatbotengine; // Must match your package name!

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service; // Marks this class as a business logic service
import jakarta.annotation.PostConstruct;// Used to run a method immediately after startup
import java.util.List;

@Service // Spring will automatically create and manage this service
public class ChatbotService {

    @Autowired // Spring automatically provides the tool to talk to the database
    private JdbcTemplate jdbcTemplate;

    // This list will hold ALL the answers loaded from MySQL (in the computer's memory)
    private List<KnowledgeBaseEntry> knowledgeBase;

    // ----------------------------------------------
    // 1. DATA LOADING (Runs once at startup)
    // ----------------------------------------------
    @PostConstruct // This annotation forces this method to run right after the app starts
    public void loadKnowledgeBase() {
        System.out.println("Loading knowledge base from MySQL...");
        String sql = "SELECT question_pattern, response FROM knowledge_base";

        // Runs the SQL query and converts the results into a List of KnowledgeBaseEntry objects
        knowledgeBase = jdbcTemplate.query(sql, (rs, rowNum) ->
            new KnowledgeBaseEntry(
                rs.getString("question_pattern").toLowerCase(),
                rs.getString("response")
            )
        );
        System.out.println("Knowledge base loaded. Total patterns: " + knowledgeBase.size());
    }

    // ----------------------------------------------
    // 2. RESPONSE LOGIC (Called by the Controller)
    // ----------------------------------------------
    public String getResponse(String userQuery) {
        // Converts query to lowercase so "Hi" and "hi" both work
        String normalizedQuery = userQuery.toLowerCase().trim();

        // Simple Rule-Based Matching (Our MVP Intent Recognition)
        for (KnowledgeBaseEntry entry : knowledgeBase) {
            // If the user's question CONTAINS the pattern from the database:
            if (normalizedQuery.contains(entry.getQuestionPattern())) {
                return entry.getResponse(); // Return the corresponding answer
            }
        }

        // If no match is found, return the default message
        return "I apologize, I didn't find a direct answer. Can you rephrase your question?";
    }
}