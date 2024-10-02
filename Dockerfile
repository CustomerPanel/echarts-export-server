FROM node:20


RUN apt-get -y update
RUN apt-get install -y python3
RUN apt-get install -y python3-dev 
RUN apt-get install -y python3-pip 
RUN apt-get install -y python3-setuptools build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev build-essential libcairo2-dev libpango1.0-dev ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils libjpeg-dev libgif-dev librsvg2-dev

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
