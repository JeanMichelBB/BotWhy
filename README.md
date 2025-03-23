
# BotWhy

**BotWhy** is a chatbot application that leverages OpenAI’s GPT-4o Mini, Google Authentication, React with Vite, Python FastAPI, and MySQL. The application provides a conversational interface with authentication and secure interactions.

## Features

- **Chatbot Integration:** Uses OpenAI's GPT-4o Mini for natural language processing.
- **Authentication:** Integrated with Google OAuth for user authentication.
- **Frontend:** Built with React and Vite for a modern and efficient UI.
- **Backend:** Developed using FastAPI for high-performance API handling.
- **Database:** MySQL for persistent data storage.
- **Dockerized:** Uses Docker Compose for easy deployment and management.
- **OCI:** Deployed on Oracle Cloud Infrastructure for scalability and reliability.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setup](#setup)
3. [Environment Variables](#environment-variables)
4. [Usage](#usage)
5. [Directory Structure](#directory-structure)
6. [API Endpoints](#api-endpoints)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Contributing](#contributing)

## Prerequisites

Before getting started, ensure you have the following installed:

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) (for frontend development)
- [Python 3.8+](https://www.python.org/downloads/) (for backend development)

## Setup

### Clone the Repository

```bash
git clone https://github.com/JeanMichelBB/BotWhy.git
cd botwhy
```

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend-react
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd ../backend-api
   ```

2. Create a virtual environment:

   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:

   - **Windows:**

     ```bash
     venv\Scripts\activate
     ```

   - **macOS/Linux:**

     ```bash
     source venv/bin/activate
     ```

4. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

5. Start the backend server:

   ```bash
   uvicorn app.main:app --reload
   ```

### Database Setup

1. Ensure MySQL is running. You can use Docker Compose to start all services:

   ```bash
   docker-compose up
   ```

2. Create the necessary tables:

   ```bash
   python -c "from app.core.database import create_all_tables; create_all_tables()"
   ```

## Environment Variables

Create a `.env` file in the `backend-api` directory with the following content:

```env
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_HOST=mysql
DB_NAME=your_database_name
OPENAI_API_KEY=your_openai_api_key
SECRET_KEY=your_secret_key
```

In the `frontend-react` directory, you might also need to set up environment variables for Google authentication and API keys.

## Usage

1. Open your browser and navigate to `http://localhost:3000` for the frontend.
2. Interact with the chatbot and use Google authentication to log in.

## Directory Structure

```
botwhy/
├── backend-api/
│   ├── app/
│   ├── venv/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env
├── frontend-react/
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   ├── package.json
│   └── .env
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Authentication

- **POST /auth/google**: Authenticate user with Google OAuth.

### Chatbot

- **POST /chatbox/conversation**: Create a new conversation.
- **GET /chatbox/conversation/{id}/messages**: Retrieve messages from a conversation.

## Testing

To test the application:

1. Ensure all services are running.
2. Run frontend and backend tests:

   ```bash
   # For frontend
   npm test

   # For backend
   pytest
   ```

## Troubleshooting

- **404 Errors:** Ensure the backend server is running and the API endpoints are correct.
- **Database Connection Issues:** Verify the MySQL service is running and the credentials in the `.env` file are correct.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for improvements or bugs.

