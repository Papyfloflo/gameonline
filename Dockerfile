# Use the official Node.js image from the Docker Hub
FROM node:14

# Create and set the working directory
WORKDIR /gameonline

# Copy package.json and package-lock.json
COPY package*.json ./

# Install the project dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port that the app runs on
EXPOSE 3000

# Define the command to run the application
CMD ["node", "backend.js"]