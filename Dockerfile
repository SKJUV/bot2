# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Installe python3 ET le paquet qui crée le lien symbolique python -> python3
RUN apt-get update && apt-get install -y python3 python-is-python3 && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install app dependencies using npm ci for reproducible builds
RUN npm ci

# Copy the rest of the application's source code from the host to the image's working directory
COPY . .

# Command to run the application
CMD ["node", "index.js"]
