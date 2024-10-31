FROM node:18-alpine

# Expose the port that the app will run on
EXPOSE 3000

# Set the working directory
WORKDIR /app

# Set the environment variable for production
ENV NODE_ENV=production

# Copy the package.json and package-lock.json first for better caching
COPY package.json package-lock.json* ./

# Install dependencies without dev dependencies and clean the npm cache
RUN npm ci --omit=dev && npm cache clean --force

# Remove CLI packages since they are not needed in production by default
RUN npm remove @shopify/cli

# Copy the rest of your application code
COPY . .

# Build the application
RUN npm run build

# Command to start the application
CMD ["npm", "run", "docker-start"]
