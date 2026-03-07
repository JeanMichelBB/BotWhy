#!/bin/bash

# Load environment variables from .env
if [ -f "$(dirname "$0")/.env" ]; then
  export $(grep -v '^#' "$(dirname "$0")/.env" | xargs)
fi

MYSQL_ROOT_PASSWORD="${DB_ROOT_PASSWORD:-root}"

# Install MySQL if not present
if ! command -v mysql &>/dev/null; then
  echo "MySQL not found. Installing via Homebrew..."
  brew install mysql
fi

# Start MySQL service
echo "Starting MySQL..."
brew services start mysql

# Set root password if not already set
if mysql -u root --connect-expired-password -e "SELECT 1;" &>/dev/null 2>&1; then
  echo "Setting root password..."
  mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}'; FLUSH PRIVILEGES;"
  echo "Root password set to: ${MYSQL_ROOT_PASSWORD}"
else
  echo "MySQL is running. Root password may already be set."
fi

echo "MySQL is ready."
