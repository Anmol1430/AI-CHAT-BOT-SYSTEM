package com.mycollege.chatbotengine; // Must match your package name!

// We are only reading these two columns from the knowledge_base table.
public class KnowledgeBaseEntry {
    private String questionPattern;
    private String response;

    // Constructor: This is how we create a new object and set its values.
    public KnowledgeBaseEntry(String questionPattern, String response) {
        this.questionPattern = questionPattern;
        this.response = response;
    }

    // Getters: These are methods Node.js or other services use to 'get' the data.
    public String getQuestionPattern() {
        return questionPattern;
    }

    public String getResponse() {
        return response;
    }
}