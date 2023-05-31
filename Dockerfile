FROM node:16-buster

RUN apt-get update && \
    apt-get install -y build-essential libcairo2-dev libpango1.0-dev

RUN npm install -g canvas
# Create app directory
WORKDIR /app
COPY . /app

# Install dependencies
RUN npm install

# Node.js server runs on port 3001.
EXPOSE 3001
# Start server via NPM.
CMD node ./src/index.js
