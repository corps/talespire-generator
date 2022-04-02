FROM node:14
RUN mkdir /app
WORKDIR /app
COPY package-lock.json /app
COPY package.json /app
RUN npm install
COPY . /app
ENV PATH=/app/node_modules/.bin:$PATH
CMD npm start
