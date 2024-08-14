// src/utils/validation.js

// Import the Filter class from the bad-words package
import Filter from 'bad-words';

// Create an instance of the Filter class
const filter = new Filter();

// Function to validate message input
export const validateMessage = (message) => {
    if (!message.trim()) {
        return 'Message cannot be empty';
    }
    if (message.length > 500) {
        return 'Message cannot exceed 500 characters';
    }
    // Check for inappropriate content
    if (filter.isProfane(message)) {
        return 'Message contains inappropriate content';
    }
    return null;
};

// Function to validate title and description
export const validateTrendingConversation = (title, description) => {
    if (!title.trim()) {
        return 'Title cannot be empty';
    }
    if (title.length > 100) {
        return 'Title cannot exceed 100 characters';
    }
    if (!description.trim()) {
        return 'Description cannot be empty';
    }
    if (description.length > 300) {
        return 'Description cannot exceed 300 characters';
    }
    // Check for inappropriate content in title and description
    if (filter.isProfane(title) || filter.isProfane(description)) {
        return 'Title or description contains inappropriate content';
    }
    return null;
};