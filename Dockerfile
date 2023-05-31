FROM node:16
# Create app directory
WORKDIR /app
COPY . /app

# Install dependencies
RUN npm install

# Node.js server runs on port 3001.
EXPOSE 3001
# Start server via NPM.
CMD node ./src/index.js
