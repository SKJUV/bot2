# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Installe les dépendances système nécessaires
# python3 : requis par certains modules npm (node-gyp)
# yt-dlp  : téléchargeur YouTube (commandes play/deo)
RUN apt-get update && apt-get install -y \
    python3 \
    python-is-python3 \
    && pip3 install --break-system-packages yt-dlp \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install app dependencies using npm ci for reproducible builds
RUN npm ci

# Copy the rest of the application's source code from the host to the image's working directory
COPY . .

# Expose le port pour le health check
EXPOSE 3000

# Command to run the application
CMD ["node", "index.js"]
