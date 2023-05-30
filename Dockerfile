FROM node:16
# Create app directory
WORKDIR /app
COPY . /app

# Install dependencies
RUN npm install

# Node.js server runs on port 3000.
EXPOSE 3001
# Start server via NPM.
CMD npm start
