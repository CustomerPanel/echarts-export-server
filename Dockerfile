FROM node:20


RUN apt-get -y update
RUN apt-get install -y python3
RUN apt-get install -y python3-dev 
RUN apt-get install -y python3-pip 
RUN apt-get install -y python3-setuptools build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

ENV NODE_ENV=production

# Create app directory
WORKDIR /app
COPY . /app

# Install dependencies
RUN npm install --omit=dev

# Node.js server runs on port 3001.
EXPOSE 3001
# Start server via NPM.
CMD node ./src/index.js
