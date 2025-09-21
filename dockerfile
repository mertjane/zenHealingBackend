# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of your backend code
COPY . .

# Expose port (Render will map automatically)
EXPOSE 5000

# Start the backend
CMD ["npm", "start"]
